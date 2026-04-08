import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { clearIdentityRegistry } from '../identity/AgentIdentity';

describe('DynamicWorkerSpawnManager', () => {
  beforeEach(() => {
    DynamicWorkerSpawnManager.clear();
    clearIdentityRegistry();
  });

  it('spawns worker on first demand and reuses it for same project/agent', async () => {
    const first = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const second = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-a', chainId: 'c2', agentSlug: 'developer' },
      { emitEvents: false },
    );

    expect(first.spawned).toBe(true);
    expect(second.spawned).toBe(false);
    expect(second.worker.workerId).toBe(first.worker.workerId);
    expect(second.worker.runCount).toBeGreaterThanOrEqual(2);
  });

  it('creates isolated workers per project for same agent slug', async () => {
    const one = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const two = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-b', chainId: 'c2', agentSlug: 'developer' },
      { emitEvents: false },
    );

    expect(one.worker.identityKey).not.toBe(two.worker.identityKey);
    expect(one.worker.memoryNamespace).toBe('memory:proj-a:developer');
    expect(two.worker.memoryNamespace).toBe('memory:proj-b:developer');
  });

  it('creates dedicated worker per agent within same project and reuses only agent-owned worker', async () => {
    const devFirst = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const qaFirst = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-a', chainId: 'c2', agentSlug: 'tdd-qa' },
      { emitEvents: false },
    );
    const devSecond = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r3', projectId: 'proj-a', chainId: 'c3', agentSlug: 'developer' },
      { emitEvents: false },
    );

    expect(devFirst.worker.workerId).not.toBe(qaFirst.worker.workerId);
    expect(devFirst.worker.memoryNamespace).toBe('memory:proj-a:developer');
    expect(qaFirst.worker.memoryNamespace).toBe('memory:proj-a:tdd-qa');
    expect(devSecond.worker.workerId).toBe(devFirst.worker.workerId);
    expect(devSecond.worker.workerId).not.toBe(qaFirst.worker.workerId);
  });

  it('tracks task-level memory namespace per assigned task', async () => {
    const first = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r-task-1', projectId: 'proj-a', chainId: 'c-task-1', agentSlug: 'developer', taskId: 'task-1' },
      { emitEvents: false },
    );
    const second = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r-task-2', projectId: 'proj-a', chainId: 'c-task-2', agentSlug: 'developer', taskId: 'task-2' },
      { emitEvents: false },
    );

    expect(first.worker.assignedTask?.taskMemoryNamespace).toBe('memory:proj-a:developer:task:task-1');
    expect(second.worker.assignedTask?.taskMemoryNamespace).toBe('memory:proj-a:developer:task:task-2');
  });

  it('reports worker health by heartbeat age', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const base = Date.now();
    const snapshotHealthy = DynamicWorkerSpawnManager.healthSnapshot({
      projectId: 'proj-a',
      now: base + 1000,
      heartbeatTimeoutMs: 10000,
    });
    expect(snapshotHealthy[0]?.health).toBe('healthy');

    const snapshotDead = DynamicWorkerSpawnManager.healthSnapshot({
      projectId: 'proj-a',
      now: base + 12000,
      heartbeatTimeoutMs: 10000,
    });
    expect(snapshotDead[0]?.health).toBe('dead');
  });

  it('enforces per-project/global pool caps via eviction of idle candidates', async () => {
    process.env.RUNTIME_MAX_WORKERS_PER_PROJECT = '1';
    process.env.RUNTIME_MAX_WORKERS_GLOBAL = '2';
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'pm-orchestrator' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.releaseToStandby(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'pm-orchestrator' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-a', chainId: 'c2', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const projAWorkers = DynamicWorkerSpawnManager.snapshot().filter((w) => w.projectId === 'proj-a');
    expect(projAWorkers.length).toBeLessThanOrEqual(1);

    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r3', projectId: 'proj-b', chainId: 'c3', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await expect(
      DynamicWorkerSpawnManager.ensureWorker(
        { runId: 'r4', projectId: 'proj-c', chainId: 'c4', agentSlug: 'developer' },
        { emitEvents: false },
      ),
    ).rejects.toThrow('cap enforcement failed');
    expect(DynamicWorkerSpawnManager.snapshot().length).toBeLessThanOrEqual(2);
    delete process.env.RUNTIME_MAX_WORKERS_PER_PROJECT;
    delete process.env.RUNTIME_MAX_WORKERS_GLOBAL;
  });

  it('prunes idle workers by timeout', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.releaseToStandby(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const before = DynamicWorkerSpawnManager.snapshot();
    expect(before.length).toBeGreaterThan(0);
    const removed = DynamicWorkerSpawnManager.pruneIdleWorkers({
      projectId: 'proj-a',
      now: Date.now() + 20000,
      idleTimeoutMs: 1000,
    });
    expect(removed.removed).toBeGreaterThanOrEqual(1);
    expect(DynamicWorkerSpawnManager.snapshot().filter((w) => w.projectId === 'proj-a').length).toBe(0);
  });

  it('collects utilization metrics (invocations, cold-start, task duration, idle)', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.releaseToStandby(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.releaseToStandby(
      { runId: 'r2', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );

    const utilization = DynamicWorkerSpawnManager.utilizationSnapshot({ projectId: 'proj-a' });
    expect(utilization.length).toBeGreaterThanOrEqual(1);
    expect(utilization[0]?.invocationCount).toBeGreaterThanOrEqual(2);
    expect(utilization[0]?.coldStartCount).toBeGreaterThanOrEqual(1);
    expect(utilization[0]?.avgTaskDurationMs).toBeGreaterThanOrEqual(0);
    expect(utilization[0]?.totalIdleMs).toBeGreaterThanOrEqual(0);
  });

  it('exposes controller contract fields for swarm board', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      {
        runId: 'r1',
        projectId: 'proj-a',
        chainId: 'c1',
        agentSlug: 'developer',
        taskId: 'task-1',
        stageId: 'dev-stage',
        pipelineId: 'feature-change',
      },
      { emitEvents: false },
    );
    const rows = DynamicWorkerSpawnManager.controllerContractSnapshot({ projectId: 'proj-a' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.enabled).toBe(true);
    expect(rows[0]?.availabilityState).toBe('hot');
    expect(rows[0]?.executionState).toBe('active');
    expect(rows[0]?.heartbeatFreshness).toBe('fresh');
    expect(rows[0]?.assignedTask?.taskId).toBe('task-1');
  });

  it('recovers failed worker to active on next ensure', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.markFailed(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      'simulated_crash',
      { emitEvents: false },
    );
    const failed = DynamicWorkerSpawnManager.snapshot()[0];
    expect(failed?.state).toBe('failed');

    const recovered = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-a', chainId: 'c2', agentSlug: 'developer' },
      { emitEvents: false },
    );

    expect(recovered.spawned).toBe(false);
    expect(recovered.worker.state).toBe('active');
  });

  it('blocks new task acquisition while worker is manually paused and allows after resume', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.controlWorker({
      projectId: 'proj-a',
      agentSlug: 'developer',
      action: 'pause',
      runId: 'ctl-1',
      chainId: 'control',
      emitEvents: false,
    });

    await expect(
      DynamicWorkerSpawnManager.ensureWorker(
        { runId: 'r2', projectId: 'proj-a', chainId: 'c2', agentSlug: 'developer' },
        { emitEvents: false },
      ),
    ).rejects.toThrow('worker_paused');

    await DynamicWorkerSpawnManager.controlWorker({
      projectId: 'proj-a',
      agentSlug: 'developer',
      action: 'resume',
      runId: 'ctl-2',
      chainId: 'control',
      emitEvents: false,
    });

    const resumed = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r3', projectId: 'proj-a', chainId: 'c3', agentSlug: 'developer' },
      { emitEvents: false },
    );
    expect(resumed.worker.state).toBe('active');
  });

  it('restart creates new worker instance id', async () => {
    const first = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    const restarted = await DynamicWorkerSpawnManager.controlWorker({
      projectId: 'proj-a',
      agentSlug: 'developer',
      action: 'restart',
      runId: 'ctl-3',
      chainId: 'control',
      emitEvents: false,
    });
    expect(restarted.ok).toBe(true);
    if (restarted.ok) {
      expect(restarted.worker?.workerId).toBeTruthy();
      expect(restarted.worker?.workerId).not.toBe(first.worker.workerId);
    }
  });

  it('blocks worker allocation when project is paused and allows after resume', async () => {
    DynamicWorkerSpawnManager.setProjectPaused('proj-a', true);
    await expect(
      DynamicWorkerSpawnManager.ensureWorker(
        { runId: 'r11', projectId: 'proj-a', chainId: 'c11', agentSlug: 'developer' },
        { emitEvents: false },
      ),
    ).rejects.toThrow('project_paused');

    DynamicWorkerSpawnManager.setProjectPaused('proj-a', false);
    const lease = await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r12', projectId: 'proj-a', chainId: 'c12', agentSlug: 'developer' },
      { emitEvents: false },
    );
    expect(lease.worker.projectId).toBe('proj-a');
  });
});
