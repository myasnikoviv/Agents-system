import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { buildAgentIdentity, assertWorkerProjectIsolation } from '../identity/AgentIdentity';
import { WorkerLifecycleState, applyLifecycleTransition } from './WorkerLifecycleStateMachine';
import { resolveWorkerHeatMode } from './EnvironmentWorkerHeatPolicy';
import { resolveRuntimeInfrastructureProfile } from '../infrastructure/RuntimeInfrastructureProfile';
import { getRedisClient } from '../redisClient';
import { resolveTenantScope, tenantNamespace } from '../tenancy/TenantContext';

export interface RuntimeWorkerRecord {
  tenantId?: string;
  workspaceId?: string;
  projectId: string;
  environmentId?: string;
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
  heatMode?: 'hot' | 'cold';
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
  environmentId?: string;
  tenantId?: string;
  workspaceId?: string;
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

let db: Database.Database | null = null;
const SHARED_WORKER_POOL_HASH = 'runtime:worker:pool';
const SHARED_WORKER_LOCK_PREFIX = 'runtime:worker:lock';

function getDb(): Database.Database {
  if (db) return db;
  const dbPath = path.resolve(process.cwd(), '.agent-system', 'worker-pool.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS runtime_worker_pool (
      worker_key TEXT PRIMARY KEY,
      worker_json TEXT NOT NULL,
      project_id TEXT NOT NULL,
      agent_slug TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      state TEXT NOT NULL,
      last_used_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_runtime_worker_pool_project ON runtime_worker_pool(project_id);
    CREATE INDEX IF NOT EXISTS idx_runtime_worker_pool_project_agent ON runtime_worker_pool(project_id, agent_slug);
    CREATE INDEX IF NOT EXISTS idx_runtime_worker_pool_state ON runtime_worker_pool(state);
    CREATE TABLE IF NOT EXISTS runtime_paused_projects (
      project_id TEXT PRIMARY KEY
    );
  `);
  return db;
}

function cfg() {
  return {
    maxWorkersPerProject: Math.max(1, Number(process.env.RUNTIME_MAX_WORKERS_PER_PROJECT || 6)),
    maxWorkersGlobal: Math.max(1, Number(process.env.RUNTIME_MAX_WORKERS_GLOBAL || 24)),
    idleTimeoutMs: Math.max(1000, Number(process.env.RUNTIME_WORKER_IDLE_TIMEOUT_MS || 120000)),
    hotDemotionIdleTimeoutMs: Math.max(1000, Number(process.env.RUNTIME_HOT_DEMOTION_IDLE_TIMEOUT_MS || 60000)),
  };
}

function normalizeEnvironmentId(value?: string): string {
  const normalized = String(value || '').trim();
  return normalized || 'env:global';
}

function normalizeScopeId(value: string | undefined, fallback: string): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function keyOf(input: {
  tenantId?: string;
  workspaceId?: string;
  projectId: string;
  agentSlug: string;
  environmentId?: string;
}): string {
  const projectId = normalizeScopeId(input.projectId, 'default');
  const tenantId = normalizeScopeId(input.tenantId, `tenant:${projectId}`);
  const workspaceId = normalizeScopeId(input.workspaceId, `workspace:${projectId}`);
  return `${tenantId}:${workspaceId}:${projectId}:${normalizeEnvironmentId(input.environmentId)}:${input.agentSlug}`;
}

function safeJsonParse(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mapRowToRecord(row: any): RuntimeWorkerRecord | null {
  const parsed = safeJsonParse(String(row?.worker_json || ''));
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed as RuntimeWorkerRecord;
}

function poolGet(key: string): RuntimeWorkerRecord | undefined {
  const row = getDb().prepare(`SELECT worker_json FROM runtime_worker_pool WHERE worker_key = ?`).get(key) as any;
  if (!row) return undefined;
  return mapRowToRecord(row) || undefined;
}

function poolSet(key: string, record: RuntimeWorkerRecord): void {
  getDb()
    .prepare(
      `INSERT INTO runtime_worker_pool (worker_key, worker_json, project_id, agent_slug, worker_id, state, last_used_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(worker_key) DO UPDATE SET
         worker_json = excluded.worker_json,
         project_id = excluded.project_id,
         agent_slug = excluded.agent_slug,
         worker_id = excluded.worker_id,
         state = excluded.state,
         last_used_at = excluded.last_used_at`,
    )
    .run(
      key,
      JSON.stringify(record),
      record.projectId,
      record.agentSlug,
      record.workerId,
      record.state,
      Number(record.lastUsedAt || Date.now()),
      Number(record.createdAt || Date.now()),
    );
}

function poolDelete(key: string): void {
  getDb().prepare(`DELETE FROM runtime_worker_pool WHERE worker_key = ?`).run(key);
}

function poolEntries(): Array<[string, RuntimeWorkerRecord]> {
  const rows = getDb().prepare(`SELECT worker_key, worker_json FROM runtime_worker_pool`).all() as Array<any>;
  return rows
    .map((row) => [String(row.worker_key), mapRowToRecord(row)] as const)
    .filter((entry): entry is [string, RuntimeWorkerRecord] => Boolean(entry[1]));
}

function poolValues(): RuntimeWorkerRecord[] {
  return poolEntries().map(([, record]) => record);
}

function poolSize(): number {
  const row = getDb().prepare(`SELECT COUNT(*) as c FROM runtime_worker_pool`).get() as any;
  return Number(row?.c || 0);
}

function poolClear(): void {
  getDb().prepare(`DELETE FROM runtime_worker_pool`).run();
}

function useSharedWorkerState(): boolean {
  return resolveRuntimeInfrastructureProfile().sharedWorkerStateBackend === 'redis';
}

async function sharedPoolGet(key: string): Promise<RuntimeWorkerRecord | null> {
  if (!useSharedWorkerState()) return null;
  const redis = getRedisClient();
  const raw = await redis.hget(SHARED_WORKER_POOL_HASH, key);
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed as RuntimeWorkerRecord;
}

async function sharedPoolSet(key: string, record: RuntimeWorkerRecord): Promise<void> {
  if (!useSharedWorkerState()) return;
  const redis = getRedisClient();
  await redis.hset(SHARED_WORKER_POOL_HASH, key, JSON.stringify(record));
}

async function sharedPoolDelete(key: string): Promise<void> {
  if (!useSharedWorkerState()) return;
  const redis = getRedisClient();
  await redis.hdel(SHARED_WORKER_POOL_HASH, key);
}

async function acquireWorkerLock(key: string): Promise<{ acquired: boolean; token: string }> {
  if (!useSharedWorkerState()) return { acquired: true, token: 'local' };
  const redis = getRedisClient();
  const token = `${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  const lockKey = `${SHARED_WORKER_LOCK_PREFIX}:${key}`;
  const ttlMs = Math.max(1000, Number(process.env.RUNTIME_SHARED_WORKER_LOCK_TTL_MS || 5000));
  const result = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
  return { acquired: result === 'OK', token };
}

async function releaseWorkerLock(key: string, token: string): Promise<void> {
  if (!useSharedWorkerState()) return;
  const redis = getRedisClient();
  const lockKey = `${SHARED_WORKER_LOCK_PREFIX}:${key}`;
  await redis.eval(
    `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    end
    return 0
    `,
    1,
    lockKey,
    token,
  );
}

function pausedProjectHas(projectId: string): boolean {
  const row = getDb().prepare(`SELECT 1 as present FROM runtime_paused_projects WHERE project_id = ?`).get(projectId) as any;
  return Boolean(row?.present);
}

function pausedProjectSet(projectId: string, paused: boolean): void {
  if (paused) {
    getDb().prepare(`INSERT OR IGNORE INTO runtime_paused_projects(project_id) VALUES (?)`).run(projectId);
    return;
  }
  getDb().prepare(`DELETE FROM runtime_paused_projects WHERE project_id = ?`).run(projectId);
}

function pausedProjectsClear(): void {
  getDb().prepare(`DELETE FROM runtime_paused_projects`).run();
}

function scopedMemoryNamespace(input: {
  tenantId?: string;
  workspaceId?: string;
  projectId: string;
  environmentId?: string;
  runId: string;
  agentSlug: string;
}): string {
  const hasExplicitTenantScope =
    String(input.tenantId || '').trim().length > 0 ||
    String(input.workspaceId || '').trim().length > 0 ||
    String(input.environmentId || '').trim().length > 0;
  if (!hasExplicitTenantScope) {
    return `memory:${input.projectId}:${input.agentSlug}`;
  }
  const scope = resolveTenantScope({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    runId: input.runId,
    agentSlug: input.agentSlug,
  });
  return `${tenantNamespace(scope, 'memory')}:agent:${input.agentSlug}`;
}

function taskMemoryNamespace(input: {
  tenantId?: string;
  workspaceId?: string;
  projectId: string;
  environmentId?: string;
  runId: string;
  agentSlug: string;
  taskId: string;
}): string {
  const hasExplicitTenantScope =
    String(input.tenantId || '').trim().length > 0 ||
    String(input.workspaceId || '').trim().length > 0 ||
    String(input.environmentId || '').trim().length > 0;
  if (!hasExplicitTenantScope) {
    return `memory:${input.projectId}:${input.agentSlug}:task:${input.taskId}`;
  }
  return `${scopedMemoryNamespace(input)}:task:${input.taskId}`;
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
    tenantId?: string,
    workspaceId?: string,
    environmentId?: string,
  ): { key: string; record: RuntimeWorkerRecord } | null {
    if (agentSlug) {
      const directKey = keyOf({ projectId, tenantId, workspaceId, agentSlug, environmentId });
      const direct = poolGet(directKey);
      if (!direct) return null;
      if (workerId && direct.workerId !== workerId) return null;
      return { key: directKey, record: direct };
    }
    if (!workerId) return null;
    for (const [key, record] of poolEntries()) {
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
    return poolEntries()
      .filter(([, rec]) => rec.projectId === projectId && (rec.state === 'idle' || rec.state === 'hot' || rec.state === 'cold'))
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  }

  private static globalEvictionCandidates(): Array<[string, RuntimeWorkerRecord]> {
    return poolEntries()
      .filter(([, rec]) => rec.state === 'idle' || rec.state === 'hot' || rec.state === 'cold')
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  }

  private static enforcePoolCaps(projectId: string): { ok: boolean; reason?: string } {
    const { maxWorkersPerProject, maxWorkersGlobal } = cfg();
    let projectWorkers = poolValues().filter((w) => w.projectId === projectId).length;
    while (projectWorkers >= maxWorkersPerProject) {
      const candidate = this.eligibleEvictionCandidates(projectId)[0];
      if (!candidate) break;
      poolDelete(candidate[0]);
      projectWorkers -= 1;
    }
    if (projectWorkers >= maxWorkersPerProject) {
      return { ok: false, reason: 'project_worker_cap_reached' };
    }
    while (poolSize() >= maxWorkersGlobal) {
      const candidate = this.globalEvictionCandidates()[0];
      if (!candidate) break;
      poolDelete(candidate[0]);
    }
    if (poolSize() >= maxWorkersGlobal) {
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
    poolSet(
      keyOf({
        projectId: record.projectId,
        tenantId: record.tenantId,
        workspaceId: record.workspaceId,
        agentSlug: record.agentSlug,
        environmentId: record.environmentId,
      }),
      record,
    );
    await sharedPoolSet(
      keyOf({
        projectId: record.projectId,
        tenantId: record.tenantId,
        workspaceId: record.workspaceId,
        agentSlug: record.agentSlug,
        environmentId: record.environmentId,
      }),
      record,
    );
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
    const tenantId = String(input.tenantId || '').trim() || undefined;
    const workspaceId = String(input.workspaceId || '').trim() || undefined;
    if (pausedProjectHas(projectId)) {
      throw new Error(`project_paused:${projectId}`);
    }
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf({ projectId, tenantId, workspaceId, agentSlug, environmentId: input.environmentId });
    const lock = await acquireWorkerLock(key);
    if (!lock.acquired) {
      throw new Error(`worker_lock_busy:${key}`);
    }
    try {
      const sharedExisting = await sharedPoolGet(key);
      if (sharedExisting) {
        poolSet(key, sharedExisting);
      }
      const existing = sharedExisting || poolGet(key);

      if (existing) {
        if (normalizeEnvironmentId(existing.environmentId) !== normalizeEnvironmentId(input.environmentId)) {
          throw new Error(`worker_environment_mismatch:${existing.workerId}`);
        }
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
          taskMemoryNamespace: taskMemoryNamespace({
            tenantId: input.tenantId,
            workspaceId: input.workspaceId,
            projectId,
            environmentId: input.environmentId,
            runId: input.runId,
            agentSlug,
            taskId: String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
          }),
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
        poolSet(key, existing);
        await sharedPoolSet(key, existing);
        return { worker: { ...existing }, spawned: false };
      }

      const cap = this.enforcePoolCaps(projectId);
      if (!cap.ok) {
        throw new Error(`DynamicWorkerSpawnManager cap enforcement failed: ${cap.reason || 'capacity_exhausted'}`);
      }

      const identity = buildAgentIdentity({
        projectId,
        agentSlug,
        tenantId,
        workspaceId,
        environmentId: input.environmentId,
        ...(input.workerId ? { workerId: input.workerId } : {}),
      });
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
      ...(tenantId ? { tenantId } : {}),
      ...(workspaceId ? { workspaceId } : {}),
      projectId,
      ...(input.environmentId ? { environmentId: String(input.environmentId) } : {}),
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
      heatMode: resolveWorkerHeatMode(agentSlug),
      assignedTask: {
        taskId: String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
        stageId: input.stageId,
        pipelineId: input.pipelineId,
        runId: input.runId,
        taskMemoryNamespace: taskMemoryNamespace({
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          projectId,
          environmentId: input.environmentId,
          runId: input.runId,
          agentSlug,
          taskId: String(input.taskId || `${input.projectId}:${input.agentSlug}:${input.runId}`),
        }),
      },
      manuallyPaused: false,
    };
      record.memoryNamespace = scopedMemoryNamespace({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        projectId,
        environmentId: input.environmentId,
        runId: input.runId,
        agentSlug,
      });
      poolSet(key, record);
      await sharedPoolSet(key, record);
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
            poolSize: poolSize(),
          },
        });
      }

      return { worker: { ...record }, spawned: true };
    } finally {
      await releaseWorkerLock(key, lock.token);
    }
  }

  static async releaseToStandby(input: EnsureWorkerInput, options?: { emitEvents?: boolean }): Promise<void> {
    const emitEvents = options?.emitEvents !== false;
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const tenantId = String(input.tenantId || '').trim() || undefined;
    const workspaceId = String(input.workspaceId || '').trim() || undefined;
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf({ projectId, tenantId, workspaceId, agentSlug, environmentId: input.environmentId });
    const record = poolGet(key);
    if (!record) return;
    await this.transitionState(record, 'idle', input, emitEvents);
    record.lastUsedAt = Date.now();
    record.lastHeartbeatAt = Date.now();
    record.heartbeatCount += 1;
    poolSet(key, record);
    await sharedPoolSet(key, record);
  }

  static async heartbeat(input: EnsureWorkerInput, options?: { emitEvents?: boolean }): Promise<void> {
    const emitEvents = options?.emitEvents !== false;
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const tenantId = String(input.tenantId || '').trim() || undefined;
    const workspaceId = String(input.workspaceId || '').trim() || undefined;
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf({ projectId, tenantId, workspaceId, agentSlug, environmentId: input.environmentId });
    const record = poolGet(key);
    if (!record) return;
    record.lastHeartbeatAt = Date.now();
    record.heartbeatCount += 1;
    poolSet(key, record);
    await sharedPoolSet(key, record);
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
    const tenantId = String(input.tenantId || '').trim() || undefined;
    const workspaceId = String(input.workspaceId || '').trim() || undefined;
    const agentSlug = String(input.agentSlug || 'system-core').trim() || 'system-core';
    const key = keyOf({ projectId, tenantId, workspaceId, agentSlug, environmentId: input.environmentId });
    const record = poolGet(key);
    if (!record) return;
    await this.transitionState(record, 'failed', input, emitEvents);
    poolSet(key, record);
    await sharedPoolSet(key, record);
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
    return poolValues().map((w) => ({ ...w }));
  }

  static pruneIdleWorkers(input?: {
    projectId?: string;
    environmentId?: string;
    now?: number;
    idleTimeoutMs?: number;
  }): { removed: number; keys: string[] } {
    const projectId = String(input?.projectId || '').trim();
    const environmentId = String(input?.environmentId || '').trim();
    const now = Number(input?.now || Date.now());
    const idleTimeoutMs = Math.max(1000, Number(input?.idleTimeoutMs || cfg().idleTimeoutMs));
    const removed: string[] = [];
    for (const [key, worker] of poolEntries()) {
      if (projectId && worker.projectId !== projectId) continue;
      if (environmentId && String(worker.environmentId || '').trim() !== environmentId) continue;
      if (worker.state === 'active' || worker.state === 'starting') continue;
      const idleForMs = now - Number(worker.lastUsedAt || worker.createdAt || now);
      if (idleForMs >= idleTimeoutMs) {
        removed.push(key);
        poolDelete(key);
      }
    }
    return { removed: removed.length, keys: removed };
  }

  static applyIdleDemotionPolicy(input?: {
    projectId?: string;
    environmentId?: string;
    now?: number;
    demotionTimeoutMs?: number;
    evictionTimeoutMs?: number;
  }): {
    checked: number;
    demoted: number;
    evicted: number;
    beforeCount: number;
    afterCount: number;
    reducedBy: number;
  } {
    const projectId = String(input?.projectId || '').trim();
    const environmentId = String(input?.environmentId || '').trim();
    const now = Number(input?.now || Date.now());
    const demotionTimeoutMs = Math.max(1000, Number(input?.demotionTimeoutMs || cfg().hotDemotionIdleTimeoutMs));
    const evictionTimeoutMs = Math.max(1000, Number(input?.evictionTimeoutMs || cfg().idleTimeoutMs));
    const all = poolEntries()
      .filter(([, worker]) => (!projectId || worker.projectId === projectId) && (!environmentId || String(worker.environmentId || '').trim() === environmentId))
      .sort((a, b) => a[0].localeCompare(b[0]));
    const beforeCount = all.length;
    let checked = 0;
    let demoted = 0;
    let evicted = 0;

    for (const [key, worker] of all) {
      checked += 1;
      if (worker.state === 'active' || worker.state === 'starting' || worker.state === 'failed') continue;
      const idleForMs = now - Number(worker.lastUsedAt || worker.createdAt || now);

      if (worker.state === 'idle' && String(worker.heatMode || 'cold') === 'hot' && idleForMs >= demotionTimeoutMs) {
        const toStopping = applyLifecycleTransition(worker.state, 'stopping');
        if (toStopping.ok) {
          worker.state = 'stopping';
          const toCold = applyLifecycleTransition(worker.state, 'cold');
          if (toCold.ok) {
            worker.state = 'cold';
            demoted += 1;
            poolSet(key, worker);
          }
        }
      }

      const reloaded = poolGet(key);
      if (!reloaded) continue;
      const idleAgainMs = now - Number(reloaded.lastUsedAt || reloaded.createdAt || now);
      const evictable =
        reloaded.state === 'cold' ||
        (reloaded.state === 'idle' && String(reloaded.heatMode || 'cold') === 'cold');
      if (evictable && idleAgainMs >= evictionTimeoutMs) {
        poolDelete(key);
        evicted += 1;
      }
    }

    const afterCount = this.snapshot()
      .filter((worker) => (!projectId || worker.projectId === projectId) && (!environmentId || String(worker.environmentId || '').trim() === environmentId))
      .length;
    return {
      checked,
      demoted,
      evicted,
      beforeCount,
      afterCount,
      reducedBy: Math.max(0, beforeCount - afterCount),
    };
  }

  static healthSnapshot(input?: {
    projectId?: string;
    environmentId?: string;
    now?: number;
    heartbeatTimeoutMs?: number;
  }): Array<RuntimeWorkerRecord & { health: 'healthy' | 'stale' | 'dead'; heartbeatAgeMs: number }> {
    const projectId = String(input?.projectId || '').trim();
    const environmentId = String(input?.environmentId || '').trim();
    const now = Number(input?.now || Date.now());
    const heartbeatTimeoutMs = Number(input?.heartbeatTimeoutMs || Number(process.env.RUNTIME_WORKER_HEARTBEAT_TIMEOUT_MS || 45000));
    const staleThresholdMs = Math.max(1000, Math.floor(heartbeatTimeoutMs / 2));

    return this.snapshot()
      .filter((row) => (!projectId || row.projectId === projectId) && (!environmentId || String(row.environmentId || '').trim() === environmentId))
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
    environmentId?: string;
  }): Array<{
    projectId: string;
    environmentId?: string;
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
    const environmentId = String(input?.environmentId || '').trim();
    return this.snapshot()
      .filter((row) => (!projectId || row.projectId === projectId) && (!environmentId || String(row.environmentId || '').trim() === environmentId))
      .map((row) => ({
        projectId: row.projectId,
        ...(row.environmentId ? { environmentId: row.environmentId } : {}),
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
    environmentId?: string;
    now?: number;
    heartbeatTimeoutMs?: number;
  }): Array<{
    projectId: string;
    environmentId?: string;
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
    heatMode?: 'hot' | 'cold';
  }> {
    const rows = this.healthSnapshot(input);
    return rows.map((row) => ({
      projectId: row.projectId,
      ...(row.environmentId ? { environmentId: row.environmentId } : {}),
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
      heatMode: row.heatMode,
    }));
  }

  static clear(): void {
    poolClear();
    pausedProjectsClear();
  }

  static async clearAsync(): Promise<void> {
    this.clear();
    if (!useSharedWorkerState()) return;
    const redis = getRedisClient();
    await redis.del(SHARED_WORKER_POOL_HASH);
    let cursor = '0';
    do {
      const reply = await redis.scan(cursor, 'MATCH', `${SHARED_WORKER_LOCK_PREFIX}:*`, 'COUNT', 200);
      cursor = String(reply[0] || '0');
      const keys = Array.isArray(reply[1]) ? (reply[1] as string[]) : [];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  static setProjectPaused(projectId: string, paused: boolean): void {
    const id = String(projectId || '').trim();
    if (!id) return;
    pausedProjectSet(id, paused);
  }

  static isProjectPaused(projectId: string): boolean {
    const id = String(projectId || '').trim();
    if (!id) return false;
    return pausedProjectHas(id);
  }

  static async controlWorker(input: {
    projectId: string;
    tenantId?: string;
    workspaceId?: string;
    environmentId?: string;
    agentSlug?: string;
    workerId?: string;
    action: WorkerControlAction;
    runId?: string;
    chainId?: string;
    emitEvents?: boolean;
  }): Promise<{ ok: true; worker?: RuntimeWorkerRecord; removed?: boolean } | { ok: false; reason: string }> {
    const projectId = String(input.projectId || 'default').trim() || 'default';
    const action = String(input.action || '').trim() as WorkerControlAction;
    const found = this.findWorker(
      projectId,
      input.agentSlug,
      input.workerId,
      input.tenantId,
      input.workspaceId,
      input.environmentId,
    );
    if (!found) return { ok: false, reason: 'worker_not_found' };
    const { key, record } = found;

    const controlEnvelope: EnsureWorkerInput = {
      runId: input.runId || `control-${Date.now()}`,
      chainId: input.chainId || 'cockpit-worker-control',
      projectId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      environmentId: input.environmentId,
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
        poolSet(key, record);
        await sharedPoolSet(key, record);
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
        poolSet(key, record);
        await sharedPoolSet(key, record);
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
        poolDelete(key);
        await sharedPoolDelete(key);
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
        poolDelete(key);
        await sharedPoolDelete(key);
        return { ok: true, removed: true };
      }

      return { ok: false, reason: 'unknown_action' };
    } catch (error: any) {
      return { ok: false, reason: String(error?.message || 'control_failed') };
    }
  }
}
