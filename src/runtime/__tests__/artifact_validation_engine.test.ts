import { ArtifactValidationEngine } from '../meeting/ArtifactValidationEngine';
import { MeetingSpec } from '../meeting/MeetingSpec';

function spec(): MeetingSpec {
  return {
    pipeline: 'meeting',
    mode: 'debate',
    participants: ['architect', 'reviewer'],
    moderator: 'architect',
    rounds: 2,
    turn_strategy: 'round_robin',
    rules: ['each_agent_must_provide_argument', 'moderator_must_finalize_decision'],
    artifacts: ['decision', 'risks', 'solution'],
  };
}

describe('ArtifactValidationEngine', () => {
  it('passes when all required artifacts are present and rounds completed', () => {
    const engine = new ArtifactValidationEngine();
    const result = engine.validateRequiredArtifacts(
      spec(),
      [
        { name: 'decision', payload: {} },
        { name: 'risks', payload: {} },
        { name: 'solution', payload: {} },
      ],
      { currentRound: 2, completedTurns: 4, byRound: {}, completed: true },
    );
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('fails validation and blocks progression when artifacts are missing', () => {
    const engine = new ArtifactValidationEngine();
    const result = engine.validateRequiredArtifacts(
      spec(),
      [{ name: 'decision', payload: {} }],
      { currentRound: 2, completedTurns: 4, byRound: {}, completed: true },
    );
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(['risks', 'solution']));
    expect(() =>
      engine.enforceProgression(
        spec(),
        [{ name: 'decision', payload: {} }],
        { currentRound: 2, completedTurns: 4, byRound: {}, completed: true },
      ),
    ).toThrow(/blocked/i);
  });

  it('fails when rounds are not completed even if artifacts exist', () => {
    const engine = new ArtifactValidationEngine();
    const result = engine.validateRequiredArtifacts(
      spec(),
      [
        { name: 'decision', payload: {} },
        { name: 'risks', payload: {} },
        { name: 'solution', payload: {} },
      ],
      { currentRound: 1, completedTurns: 2, byRound: {}, completed: false },
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('meeting_rounds_not_completed');
  });
});

