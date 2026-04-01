import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../AgentExecutor', () => {
  return {
    AgentExecutor: class {
      async runRole() {
        const err: any = new Error('429 You exceeded your current quota');
        err.code = 'insufficient_quota';
        err.type = 'insufficient_quota';
        err.error = { code: 'insufficient_quota', type: 'insufficient_quota', param: null };
        throw err;
      }
    }
  };
});

jest.mock('../events/EventBus', () => ({
  emitEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('PilotGraph approve continuation with quota errors', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    jest.resetModules();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it('does not throw on QA step and emits fallback marker before git approval', async () => {
    const { executeQuasiLinearRun, pilotGraph } = await import('../graphs/PilotQuasiLinearGraph');

    const threadId = `thread-${Date.now()}`;
    const initialState = {
      ticketId: 'TKT-59',
      runId: `run-${Date.now()}`,
      threadId: threadId,
      status: 'initialized',
      artifactLogs: [],
      executionOptions: { mode: 'linear' as const },
    };

    const firstPass = await executeQuasiLinearRun(initialState);
    expect(Array.isArray(firstPass.artifactLogs)).toBe(true);
    expect(
      (firstPass.artifactLogs as string[]).some(
        (log) => log.includes('[stage:qa]') && log.includes('[fallback:insufficient_quota]'),
      ),
    ).toBe(true);

    const threadConfig = { configurable: { threadId: threadId } };

    // Continue from interrupt-before-git to completion.
    const resumed = await pilotGraph.invoke(null, threadConfig);

    expect(resumed).toBeDefined();
    expect(Array.isArray(resumed.artifactLogs)).toBe(true);
    expect((resumed.artifactLogs as string[]).some((log) => log.includes('[stage:docs]'))).toBe(true);
  }, 15000);
});
