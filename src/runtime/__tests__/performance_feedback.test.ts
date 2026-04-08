import { applyPerformanceFeedbackOrder } from '../performance/PerformanceFeedback';

describe('PerformanceFeedback', () => {
  it('reorders agents by descending score', () => {
    const ordered = applyPerformanceFeedbackOrder(
      ['pm-orchestrator', 'developer', 'tdd-qa'],
      [
        { agentSlug: 'pm-orchestrator', score: 40 },
        { agentSlug: 'developer', score: 90 },
        { agentSlug: 'tdd-qa', score: 60 },
      ],
    );
    expect(ordered).toEqual(['developer', 'tdd-qa', 'pm-orchestrator']);
  });
});
