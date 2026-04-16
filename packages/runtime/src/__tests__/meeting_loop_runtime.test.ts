import { MeetingLoopRuntime } from '../meeting/MeetingLoopRuntime';
import { MeetingSpec } from '../meeting/MeetingSpec';

function spec(): MeetingSpec {
  return {
    pipeline: 'meeting',
    mode: 'debate',
    participants: ['architect', 'reviewer'],
    moderator: 'architect',
    rounds: 1,
    turn_strategy: 'round_robin',
    rules: ['each_agent_must_provide_argument', 'moderator_must_finalize_decision'],
    artifacts: ['decision', 'risks'],
  };
}

describe('MeetingLoopRuntime', () => {
  it('retries when artifacts are missing and completes on next attempt', async () => {
    const runtime = new MeetingLoopRuntime(spec(), { maxAttempts: 2 });
    let collectCount = 0;

    const result = await runtime.run(
      async (turn) => `turn:${turn.participant}`,
      async () => {
        collectCount += 1;
        if (collectCount === 1) {
          return [{ name: 'decision', payload: {} }];
        }
        return [{ name: 'decision', payload: {} }, { name: 'risks', payload: {} }];
      },
    );

    expect(result.status).toBe('completed');
    expect(result.attempt).toBe(2);
  });

  it('fails when all retry attempts still violate artifact gate', async () => {
    const runtime = new MeetingLoopRuntime(spec(), { maxAttempts: 2 });

    const result = await runtime.run(
      async (turn) => `turn:${turn.participant}`,
      async () => [{ name: 'decision', payload: {} }],
    );

    expect(result.status).toBe('failed');
    expect(result.attempt).toBe(2);
    expect(String(result.failureReason || '')).toContain('missing_artifacts');
  });
});

