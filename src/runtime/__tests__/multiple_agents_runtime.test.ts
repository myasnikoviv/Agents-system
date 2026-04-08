import { executeMultipleAgentsRun } from '../graphs/MultipleAgentsRuntime';

jest.mock('../graphs/UnifiedSwarmGraph', () => ({
  executeUnifiedSwarmRun: jest.fn(async (state: any) => ({ status: 'ok', state })),
}));

jest.mock('../workers/DynamicWorkerSpawnManager', () => ({
  DynamicWorkerSpawnManager: {
    ensureWorker: jest.fn(async () => ({ worker: { workerId: 'w-1' }, spawned: true })),
  },
}));

describe('MultipleAgentsRuntime', () => {
  it('bootstraps at least two workers when multiple agents are available', async () => {
    const { DynamicWorkerSpawnManager } = require('../workers/DynamicWorkerSpawnManager');
    await executeMultipleAgentsRun({
      runId: 'run-1',
      projectId: 'proj-a',
      threadId: 'thread-1',
      customAgents: ['pm-orchestrator', 'developer', 'tdd-qa'],
    } as any);
    expect(DynamicWorkerSpawnManager.ensureWorker).toHaveBeenCalledTimes(2);
  });
});

