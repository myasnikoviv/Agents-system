import { MeetingSpec } from '../meeting/MeetingSpec';
import { RoundEngine } from '../meeting/RoundEngine';

function spec(rounds = 3): MeetingSpec {
  return {
    pipeline: 'meeting',
    mode: 'debate',
    participants: ['architect', 'reviewer'],
    moderator: 'architect',
    rounds,
    turn_strategy: 'round_robin',
    rules: ['each_agent_must_provide_argument', 'moderator_must_finalize_decision'],
    artifacts: ['decision'],
  };
}

describe('RoundEngine', () => {
  it('runs multiple rounds with persisted state', async () => {
    const engine = new RoundEngine(spec(2));
    const state = await engine.run(async (turn) => `${turn.round}:${turn.participant}`);
    expect(state.completed).toBe(true);
    expect(state.currentRound).toBe(2);
    expect(state.completedTurns).toBe(4);
    expect(state.byRound[1]).toHaveLength(2);
    expect(state.byRound[2]).toHaveLength(2);
  });

  it('supports declarative exit condition before max rounds', async () => {
    const engine = new RoundEngine(spec(4));
    const state = await engine.run(
      async (turn) => ({ turn }),
      ({ round }) => ({ shouldStop: round >= 2, reason: 'consensus_reached' }),
    );
    expect(state.completed).toBe(true);
    expect(state.currentRound).toBe(2);
    expect(state.stopReason).toBe('consensus_reached');
  });

  it('continues from initial persisted round state', async () => {
    const engine = new RoundEngine(spec(3));
    const resumed = await engine.run(
      async (turn) => `resumed:${turn.round}:${turn.participant}`,
      undefined,
      {
        currentRound: 1,
        completedTurns: 2,
        byRound: {
          1: [
            { participant: 'architect', payload: 'old:a' },
            { participant: 'reviewer', payload: 'old:r' },
          ],
        },
        completed: false,
      },
    );
    expect(resumed.currentRound).toBe(3);
    expect(resumed.completedTurns).toBe(6);
    expect(resumed.byRound[1]).toHaveLength(2);
    expect(resumed.byRound[2]).toHaveLength(2);
    expect(resumed.byRound[3]).toHaveLength(2);
  });
});

