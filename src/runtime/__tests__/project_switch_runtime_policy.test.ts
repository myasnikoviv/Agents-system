import { applyProjectSwitchRuntimePolicy } from '../policy/ProjectSwitchRuntimePolicy';
import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';
import { clearIdentityRegistry } from '../identity/AgentIdentity';

describe('ProjectSwitchRuntimePolicy', () => {
  beforeEach(() => {
    DynamicWorkerSpawnManager.clear();
    ProjectDispatchQueue.clear();
    clearIdentityRegistry();
  });

  it('keeps active project and cleans idle workers/queues for inactive projects', async () => {
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r1', projectId: 'proj-a', chainId: 'c1', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.ensureWorker(
      { runId: 'r2', projectId: 'proj-b', chainId: 'c2', agentSlug: 'developer' },
      { emitEvents: false },
    );
    await DynamicWorkerSpawnManager.releaseToStandby(
      { runId: 'r2', projectId: 'proj-b', chainId: 'c2', agentSlug: 'developer' },
      { emitEvents: false },
    );

    ProjectDispatchQueue.enqueue({
      runId: 'r2',
      projectId: 'proj-b',
      chainId: 'c2',
      pipelineId: 'feature-change',
      stageId: 'dev',
      agentSlug: 'developer',
    });

    const result = await applyProjectSwitchRuntimePolicy({
      activeProjectId: 'proj-a',
      knownProjectIds: ['proj-a', 'proj-b'],
    });

    expect(result.cleanedProjects).toContain('proj-b');
    expect(result.removedQueuedTasks).toBeGreaterThanOrEqual(1);
    expect(ProjectDispatchQueue.depth('proj-b')).toBe(0);
    expect(DynamicWorkerSpawnManager.snapshot().some((w) => w.projectId === 'proj-b')).toBe(false);
    expect(DynamicWorkerSpawnManager.snapshot().some((w) => w.projectId === 'proj-a')).toBe(true);
  });
});

