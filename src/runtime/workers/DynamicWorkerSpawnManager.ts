import { buildAgentIdentity, assertWorkerProjectIsolation } from '../identity/AgentIdentity';
import { WorkerLifecycleState, applyLifecycleTransition } from './WorkerLifecycleStateMachine';

export interface RuntimeWorkerRecord {
  projectId: string;
  agentSlug: string;
  workerId: string;
  identityKey: string;
  memoryNamespace: string;
  state: WorkerLifecycleState;
  createdAt: number;
  lastUsedAt: number;
  lastHeartbeatAt: number;
  heartbeatCount: number;
  runCount: number;
  invocationCount: number;
  coldStartCount: number;
  totalTaskDurationMs: number;
  totalIdleMs: number;
  successfulTaskCount: number;
  failedTaskCount: number;
  retryTaskCount: number;
  lastActivationAt?: number;
  lastStandbyAt?: number;
  assignedTask?: {
    taskId: string;
    stageId?: string;
    pipelineId?: string;
    runId: string;
    taskMemoryNamespace?: string;
  } | null;
  manuallyPaused?: boolean;
}

export interface EnsureWorkerInput {
  runId: string;
  projectId: string;
  chainId: string;
  agentSlug: string;
  workerId?: string;
  taskId?: string;
  stageId?: string;
  pipelineId?: string;
  retryCount?: number;
}

export interface EnsureWorkerResult {
  worker: RuntimeWorkerRecord;
  spawned: boolean;
}

export type WorkerControlAction = 'pause' | 'resume' | 'restart' | 'kill';

const pool = new Map<string, RuntimeWorkerRecord>(); // key = projectId:agentSlug
const pausedProjects = new Set<string>();

function cfg() {
  return {
    maxWorkersPerProject: Math.max(1, Number(process.env.RUNTIME_MAX_WORKERS_PER_PROJECT || 6)),
    maxWorkersGlobal: Math.max(1, Number(process.env.RUNTIME_MAX_WORKERS_GLOBAL || 24)),
    idleTimeoutMs: Math.max(1000, Number(process.env.RUNTIME_WORKER_IDLE_TIMEOUT_MS || 120000)),
  };
}

function keyOf(projectId: string, agentSlug: string): string {
  return `${projectId}:${agentSlug}`;
}

function taskMemoryNamespace(projectId: string, agentSlug: string, taskId: string): string {
  return `memory:${projectId}:${agentSlug}:task:${taskId}`;
}

async function emitRuntimeEvent(event: {
  type:
    | 'worker.starting'
    | 'worker.spawned'
    | 'worker.reused'
    | 'worker.failed'
    | 'worker.state_changed'
    | 'worker.heartbeat'
    | 'worker.unhealthy';
  runId: string;
  projectId: string;
  chainId: string;
  payload: Record<string, any>;
}): Promise<void> {
  const { emitEvent } = await import('../events/EventBus');
  await emitEvent({
    type: event.type,
    runId: event.runId,
    projectId: event.projectId,
    chainId: event.chainId,
    actor: { type: 'system', id: 'dynamic-worker-spawn-manager' },
    payload: event.payload,
  });
}

export class DynamicWorkerSpawnManager {
  private static findWorker(
    projectId: string,
    agentSlug?: string,
    workerId?: string,
  ): { key: string; record: RuntimeWorkerRecord } | null {
    if (agentSlug) {
      const directKey = keyOf(projectId, agentSlug);
      const direct = pool.get(directKey);
      if (!direct) return null;
      if (workerId && direct.workerId !== workerId) return null;
      return { key: directKey, record: direct };
    }
    if (!workerId) return null;
    for (const [key, record] of pool.entries()) {
      if (record.projectId !== projectId) continue;
      if (record.workerId === workerId) return { key, record };
    }
    return null;
  }

  private static onTransition(
    record: RuntimeWorkerRecord,
    from: WorkerLifecycleState,
    to: WorkerLifecycleState,
    now: number,
  ): void {
    if (to === 'active' && from !== 'active') {
      record.invocationCount += 1;
      if (record.lastStandbyAt) {
        record.totalIdleMs += Math.max(0, now - record.lastStandbyAt);
      }
      record.lastActivationAt = now;
    }
    if (to === 'idle' && from === 'active') {
      if (record.lastActivationAt) {
        record.totalTaskDurationMs += Math.max(0, now - record.lastActivationAt);
      }
      record.lastStandbyAt = now;
      record.successfulTaskCount += 1;
      record.assignedTask = null;
    }
    if (to === 'failed') {
      record.failedTaskCount += 1;
      record.assignedTask = null;
    }
  }

  private static eligibleEvictionCandidates(projectId: string): Array<[string, RuntimeWorkerRecord]> {
    return Array.from(pool.entries())
      .filter(([, rec]) => rec.projectId === projectId && (rec.state === 'idle' || rec.state === 'hot' || rec.state === 'cold'))
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  }

  private static globalEvictionCandidates(): Array<[string, RuntimeWorkerRecord]> {
    return Array.from(pool.entries())
      .filter(([, rec]) => rec.state === 'idle' || rec.state === 'hot' || rec.state === 'cold')
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  }

  private static enforcePoolCaps(projectId: string): { ok: boolean; reason?: string } {
    const { maxWorkersPerProject, maxWorkersGlobal } = cfg();
    let projectWorkers = Array.from(pool.values()).filter((w) => w.projectId === projectId).length;
    while (projectWorkers >= maxWorkersPerProject) {
      const candidate = this.eligibleEvictionCandidates(projectId)[0];
      if (!candidate) break;
      pool.delete(candidate[0]);
      projectWorkers -= 1;
    }
    if (projectWorkers >= maxWorkersPerProject) {
      return { ok: false, reason: 'project_worker_cap_reached' };
    }
    while (pool.size >= maxWorkersGlobal) {
      const candidate = this.globalEvictionCandidates()[0];
      if (!candidate) break;
      pool.delete(candidate[0]);
    }
    if (pool.size >= maxWorkersGlobal) {
      return { ok: false, reason: 'global_worker_cap_reached' };
    }
    return { ok: true };
  }

  private static async transitionState(
    record: RuntimeWorkerRecord,
    to: WorkerLifecycleState,
    input: EnsureWorkerInput,
    emitEvents: boolean,
  ): Promise<void> {
    const from = record.state;
    const transition = applyLifecycleTransition(from, to);
    if (!transition.ok) {
      const reason = 'reason' in transition ? transition.reason : 'invalid_transition';
      throw new Error(`DynamicWorkerSpawnManager invalid state transition: ${reason}`);
    }
    this.onTransition(record, from, transition.to, Date.now());
    record.state = transition.to;
    if (emitEvents) {
      await emitRuntimeEvent({
        type: 'worker.state_changed',
        runId: input.runId,
        projectId: input.projectId,
        chainId: input.chainId,
        payload: {
          agentSlug: record.agentSlug,
          workerId: record.workerId,
          from,
          to: record.state,
        },
      });
    }
  }

  static async ensureWorker(input: EnsureWorkerInput, options?: { emitEvents?: boolean }): Promise<EnsureWorkerResult> {
    const emitEvents = options?.emitEvents !== false;
    const projectId = String(input.projectId || 'default').trim() || 'default';
    if (pausedProjects.has(projectId)) {
      throw new Error(`project_paused:${projectId}`);
    }
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf(projectId, agentSlug);
    const existing = pool.get(key);

    if (existing) {
      if (existing.manuallyPaused) {
        throw new Error(`worker_paused:${existing.workerId}`);
      }
      existing.lastUsedAt = Date.now();
      existing.lastHeartbeatAt = Date.now();
      existing.heartbeatCount += 1;
      existing.runCount += 1;
      existing.assignedTask = {
        taskId: String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
        stageId: input.stageId,
        pipelineId: input.pipelineId,
        runId: input.runId,
        taskMemoryNamespace: taskMemoryNamespace(
          projectId,
          agentSlug,
          String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
        ),
      };
      if (Number(input.retryCount || 0) > 0) {
        existing.retryTaskCount += Number(input.retryCount || 0);
      }
      if (existing.state === 'failed') {
        await this.transitionState(existing, 'cold', input, emitEvents);
        await this.transitionState(existing, 'starting', input, emitEvents);
        await this.transitionState(existing, 'hot', input, emitEvents);
      }
      await this.transitionState(existing, 'active', input, emitEvents);
      if (emitEvents) {
        await emitRuntimeEvent({
          type: 'worker.reused',
          runId: input.runId,
          projectId,
          chainId: input.chainId,
          payload: {
            agentSlug,
            workerId: existing.workerId,
            identityKey: existing.identityKey,
            memoryNamespace: existing.memoryNamespace,
          },
        });
      }
      return { worker: { ...existing }, spawned: false };
    }

    const cap = this.enforcePoolCaps(projectId);
    if (!cap.ok) {
      throw new Error(`DynamicWorkerSpawnManager cap enforcement failed: ${cap.reason || 'capacity_exhausted'}`);
    }

    const identity = buildAgentIdentity({ projectId, agentSlug, ...(input.workerId ? { workerId: input.workerId } : {}) });
    const isolation = assertWorkerProjectIsolation(identity);
    if (!isolation.ok) {
      if (emitEvents) {
        await emitRuntimeEvent({
          type: 'worker.failed',
          runId: input.runId,
          projectId,
          chainId: input.chainId,
          payload: {
            agentSlug,
            reason: isolation.reason || 'worker_identity_isolation_failed',
          },
        });
      }
      throw new Error(`DynamicWorkerSpawnManager isolation failed: ${isolation.reason || 'unknown'}`);
    }

    if (emitEvents) {
      await emitRuntimeEvent({
        type: 'worker.starting',
        runId: input.runId,
        projectId,
        chainId: input.chainId,
        payload: {
          agentSlug,
          workerId: identity.workerId,
          identityKey: identity.identityKey,
        },
      });
    }

    const record: RuntimeWorkerRecord = {
      projectId,
      agentSlug,
      workerId: identity.workerId,
      identityKey: identity.identityKey,
      memoryNamespace: identity.memoryNamespace,
      state: 'cold',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      heartbeatCount: 1,
      runCount: 1,
      invocationCount: 0,
      coldStartCount: 1,
      totalTaskDurationMs: 0,
      totalIdleMs: 0,
      successfulTaskCount: 0,
      failedTaskCount: 0,
      retryTaskCount: Number(input.retryCount || 0),
      assignedTask: {
        taskId: String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
        stageId: input.stageId,
        pipelineId: input.pipelineId,
        runId: input.runId,
        taskMemoryNamespace: taskMemoryNamespace(
          projectId,
          agentSlug,
          String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
        ),
      },
      manuallyPaused: false,
    };
    pool.set(key, record);
    await this.transitionState(record, 'starting', input, emitEvents);
    await this.transitionState(record, 'hot', input, emitEvents);
    await this.transitionState(record, 'active', input, emitEvents);

    if (emitEvents) {
      await emitRuntimeEvent({
        type: 'worker.spawned',
        runId: input.runId,
        projectId,
        chainId: input.chainId,
        payload: {
          agentSlug,
          workerId: record.workerId,
          identityKey: record.identityKey,
          memoryNamespace: record.memoryNamespace,
          poolSize: pool.size,
        },
      });
    }

    return { worker: { ...record }, spawned: true };
  }

  static async releaseToStandby(input: EnsureWorkerInput, options?: { emitEvents?: boolean }): Promise<void> {
    const emitEvents = options?.emitEvents !== false;
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf(projectId, agentSlug);
    const record = pool.get(key);
    if (!record) return;
    await this.transitionState(record, 'idle', input, emitEvents);
    record.lastUsedAt = Date.now();
    record.lastHeartbeatAt = Date.now();
    record.heartbeatCount += 1;
  }

  static async heartbeat(input: EnsureWorkerInput, options?: { emitEvents?: boolean }): Promise<void> {
    const emitEvents = options?.emitEvents !== false;
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf(projectId, agentSlug);
    const record = pool.get(key);
    if (!record) return;
    record.lastHeartbeatAt = Date.now();
    record.heartbeatCount += 1;
    if (emitEvents) {
      await emitRuntimeEvent({
        type: 'worker.heartbeat',
        runId: input.runId,
        projectId,
        chainId: input.chainId,
        payload: {
          agentSlug,
          workerId: record.workerId,
          state: record.state,
          heartbeatCount: record.heartbeatCount,
        },
      });
    }
  }

  static async markFailed(input: EnsureWorkerInput, reason: string, options?: { emitEvents?: boolean }): Promise<void> {
    const emitEvents = options?.emitEvents !== false;
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf(projectId, agentSlug);
    const record = pool.get(key);
    if (!record) return;
    await this.transitionState(record, 'failed', input, emitEvents);
    if (emitEvents) {
      await emitRuntimeEvent({
        type: 'worker.failed',
        runId: input.runId,
        projectId,
        chainId: input.chainId,
        payload: {
          agentSlug,
          workerId: record.workerId,
          reason: reason || 'execution_failure',
        },
      });
    }
  }

  static snapshot(): RuntimeWorkerRecord[] {
    return Array.from(pool.values()).map((w) => ({ ...w }));
  }

  static pruneIdleWorkers(input?: {
    projectId?: string;
    now?: number;
    idleTimeoutMs?: number;
  }): { removed: number; keys: string[] } {
    const projectId = String(input?.projectId || '').trim();
    const now = Number(input?.now || Date.now());
    const idleTimeoutMs = Math.max(1000, Number(input?.idleTimeoutMs || cfg().idleTimeoutMs));
    const removed: string[] = [];
    for (const [key, worker] of pool.entries()) {
      if (projectId && worker.projectId !== projectId) continue;
      if (worker.state === 'active' || worker.state === 'starting') continue;
      const idleForMs = now - Number(worker.lastUsedAt || worker.createdAt || now);
      if (idleForMs >= idleTimeoutMs) {
        removed.push(key);
        pool.delete(key);
      }
    }
    return { removed: removed.length, keys: removed };
  }

  static healthSnapshot(input?: {
    projectId?: string;
    now?: number;
    heartbeatTimeoutMs?: number;
  }): Array<RuntimeWorkerRecord & { health: 'healthy' | 'stale' | 'dead'; heartbeatAgeMs: number }> {
    const projectId = String(input?.projectId || '').trim();
    const now = Number(input?.now || Date.now());
    const heartbeatTimeoutMs = Number(input?.heartbeatTimeoutMs || Number(process.env.RUNTIME_WORKER_HEARTBEAT_TIMEOUT_MS || 45000));
    const staleThresholdMs = Math.max(1000, Math.floor(heartbeatTimeoutMs / 2));

    return this.snapshot()
      .filter((row) => !projectId || row.projectId === projectId)
      .map((row) => {
        const baseTs = Number(row.lastHeartbeatAt || row.lastUsedAt || row.createdAt || now);
        const heartbeatAgeMs = Math.max(0, now - baseTs);
        const health: 'healthy' | 'stale' | 'dead' =
          heartbeatAgeMs >= heartbeatTimeoutMs ? 'dead' : heartbeatAgeMs >= staleThresholdMs ? 'stale' : 'healthy';
        return { ...row, health, heartbeatAgeMs };
      });
  }

  static utilizationSnapshot(input?: {
    projectId?: string;
  }): Array<{
    projectId: string;
    agentSlug: string;
    workerId: string;
    invocationCount: number;
    coldStartCount: number;
    totalTaskDurationMs: number;
    avgTaskDurationMs: number;
    totalIdleMs: number;
    successfulTaskCount: number;
    failedTaskCount: number;
    retryTaskCount: number;
    successRate: number;
    lastHeartbeatAt: number;
    state: WorkerLifecycleState;
  }> {
    const projectId = String(input?.projectId || '').trim();
    return this.snapshot()
      .filter((row) => !projectId || row.projectId === projectId)
      .map((row) => ({
        projectId: row.projectId,
        agentSlug: row.agentSlug,
        workerId: row.workerId,
        invocationCount: Number(row.invocationCount || 0),
        coldStartCount: Number(row.coldStartCount || 0),
        totalTaskDurationMs: Number(row.totalTaskDurationMs || 0),
        avgTaskDurationMs:
          Number(row.invocationCount || 0) > 0
            ? Math.round(Number(row.totalTaskDurationMs || 0) / Number(row.invocationCount || 1))
            : 0,
        totalIdleMs: Number(row.totalIdleMs || 0),
        successfulTaskCount: Number(row.successfulTaskCount || 0),
        failedTaskCount: Number(row.failedTaskCount || 0),
        retryTaskCount: Number(row.retryTaskCount || 0),
        successRate:
          Number(row.successfulTaskCount || 0) + Number(row.failedTaskCount || 0) > 0
            ? Number(row.successfulTaskCount || 0) /
              (Number(row.successfulTaskCount || 0) + Number(row.failedTaskCount || 0))
            : 1,
        lastHeartbeatAt: Number(row.lastHeartbeatAt || 0),
        state: row.state,
      }));
  }

  static controllerContractSnapshot(input?: {
    projectId?: string;
    now?: number;
    heartbeatTimeoutMs?: number;
  }): Array<{
    projectId: string;
    agentSlug: string;
    workerId: string;
    enabled: boolean;
    availabilityState: 'hot' | 'cold';
    executionState: 'active' | 'standby';
    rawLifecycleState: WorkerLifecycleState;
    heartbeatFreshness: 'fresh' | 'stale' | 'dead';
    heartbeatAgeMs: number;
    assignedTask: RuntimeWorkerRecord['assignedTask'] | null;
    memoryNamespace: string;
    isPaused: boolean;
  }> {
    const rows = this.healthSnapshot(input);
    return rows.map((row) => ({
      projectId: row.projectId,
      agentSlug: row.agentSlug,
      workerId: row.workerId,
      enabled: row.state !== 'failed',
      availabilityState: row.state === 'cold' || row.state === 'stopping' ? 'cold' : 'hot',
      executionState: row.state === 'active' ? 'active' : 'standby',
      rawLifecycleState: row.state,
      heartbeatFreshness: row.health === 'healthy' ? 'fresh' : row.health === 'stale' ? 'stale' : 'dead',
      heartbeatAgeMs: row.heartbeatAgeMs,
      assignedTask: row.assignedTask || null,
      memoryNamespace: row.memoryNamespace,
      isPaused: Boolean(row.manuallyPaused),
    }));
  }

  static clear(): void {
    pool.clear();
    pausedProjects.clear();
  }

  static setProjectPaused(projectId: string, paused: boolean): void {
    const id = String(projectId || '').trim();
    if (!id) return;
    if (paused) pausedProjects.add(id);
    else pausedProjects.delete(id);
  }

  static isProjectPaused(projectId: string): boolean {
    const id = String(projectId || '').trim();
    if (!id) return false;
    return pausedProjects.has(id);
  }

  static async controlWorker(input: {
    projectId: string;
    agentSlug?: string;
    workerId?: string;
    action: WorkerControlAction;
    runId?: string;
    chainId?: string;
    emitEvents?: boolean;
  }): Promise<{ ok: true; worker?: RuntimeWorkerRecord; removed?: boolean } | { ok: false; reason: string }> {
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const action = String(input.action || '').trim() as WorkerControlAction;
    const found = this.findWorker(projectId, input.agentSlug, input.workerId);
    if (!found) return { ok: false, reason: 'worker_not_found' };
    const { key, record } = found;

    const controlEnvelope: EnsureWorkerInput = {
      runId: input.runId || `control-${Date.now()}`,
      chainId: input.chainId || 'cockpit-worker-control',
      projectId,
      agentSlug: record.agentSlug,
      taskId: record.assignedTask?.taskId || `control:${record.workerId}`,
      stageId: record.assignedTask?.stageId,
      pipelineId: record.assignedTask?.pipelineId,
    };
    const emitEvents = input.emitEvents !== false;

    try {
      if (action === 'pause') {
        record.manuallyPaused = true;
        if (record.state === 'active') {
          await this.transitionState(record, 'idle', controlEnvelope, emitEvents);
        } else if (record.state !== 'idle') {
          return { ok: false, reason: `pause_not_allowed_from_${record.state}` };
        }
        record.lastUsedAt = Date.now();
        record.lastHeartbeatAt = Date.now();
        return { ok: true, worker: { ...record } };
      }

      if (action === 'resume') {
        record.manuallyPaused = false;
        if (record.state === 'hot') {
          await this.transitionState(record, 'active', controlEnvelope, emitEvents);
          await this.transitionState(record, 'idle', controlEnvelope, emitEvents);
        } else if (record.state === 'active') {
          await this.transitionState(record, 'idle', controlEnvelope, emitEvents);
        } else if (record.state !== 'idle') {
          return { ok: false, reason: `resume_not_allowed_from_${record.state}` };
        }
        record.lastUsedAt = Date.now();
        record.lastHeartbeatAt = Date.now();
        record.heartbeatCount += 1;
        return { ok: true, worker: { ...record } };
      }

      if (action === 'restart') {
        record.manuallyPaused = false;
        if (record.state === 'active' || record.state === 'idle' || record.state === 'hot') {
          await this.transitionState(record, 'stopping', controlEnvelope, emitEvents);
          await this.transitionState(record, 'cold', controlEnvelope, emitEvents);
        } else if (record.state === 'failed') {
          await this.transitionState(record, 'cold', controlEnvelope, emitEvents);
        } else if (record.state !== 'cold') {
          return { ok: false, reason: `restart_not_allowed_from_${record.state}` };
        }
        pool.delete(key);
        const restarted = await this.ensureWorker(
          {
            ...controlEnvelope,
            runId: `${controlEnvelope.runId}:restart`,
            workerId: `${record.workerId}-r${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            taskId: `restart:${record.agentSlug}:${Date.now()}`,
          },
          { emitEvents },
        );
        await this.releaseToStandby(
          {
            ...controlEnvelope,
            runId: `${controlEnvelope.runId}:restart-release`,
            agentSlug: restarted.worker.agentSlug,
          },
          { emitEvents },
        );
        return { ok: true, worker: { ...restarted.worker, manuallyPaused: false } };
      }

      if (action === 'kill') {
        if (record.state === 'active' || record.state === 'idle' || record.state === 'hot') {
          await this.transitionState(record, 'stopping', controlEnvelope, emitEvents);
          await this.transitionState(record, 'cold', controlEnvelope, emitEvents);
        } else if (record.state === 'failed') {
          // no-op, already terminal
        } else if (record.state !== 'cold') {
          return { ok: false, reason: `kill_not_allowed_from_${record.state}` };
        }
        pool.delete(key);
        return { ok: true, removed: true };
      }

      return { ok: false, reason: 'unknown_action' };
    } catch (error: any) {
      return { ok: false, reason: String(error?.message || 'control_failed') };
    }
  }
}
