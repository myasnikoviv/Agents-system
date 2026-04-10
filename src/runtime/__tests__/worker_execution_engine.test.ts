import { WorkerExecutionEngine } from '../workers/WorkerExecutionEngine';

describe('WorkerExecutionEngine', () => {
  it('executes worker task and returns structured success result', async () => {
    const result = await WorkerExecutionEngine.executeTask({
      timeoutMs: 5000,
      stageId: 'dev',
      agentSlug: 'developer',
      runContext: {
        agent: { slug: 'developer' },
        memory: { workerId: 'worker-dev-1' },
        __processProbe: {},
      },
    });
    expect(result.ok).toBe(true);
    expect(result.failed).toBe(false);
    expect(result.content).toContain('"agentSlug":"developer"');
  });

  it('returns structured failure result for invalid run context', async () => {
    const result = await WorkerExecutionEngine.executeTask({
      timeoutMs: 3000,
      stageId: 'dev',
      agentSlug: 'developer',
      runContext: null,
    });
    expect(result.ok).toBe(false);
    expect(result.failed).toBe(true);
    expect(String(result.error || '').length).toBeGreaterThan(0);
  });
});
