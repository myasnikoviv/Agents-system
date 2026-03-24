import { evaluateIntakeQuality } from '../IntakeGovernance';

describe('IntakeGovernance', () => {
  it('passes well-scoped message', () => {
    const result = evaluateIntakeQuality(
      'Feature request: redesign UI using Codex reference screenshot. Acceptance criteria: runtime footer and settings route parity.',
    );
    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('blocks short ambiguous UI message without references', () => {
    const result = evaluateIntakeQuality('fix ui');
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain('message_too_short');
    expect(result.reasons).toContain('ui_missing_references');
  });

  it('requires structured intake for complex pipeline requests', () => {
    const result = evaluateIntakeQuality(
      'Need multi-agent pipeline with architecture and sprint execution across branches and worktrees.',
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain('complex_request_without_structured_intake');
    expect(
      result.requiredQuestions.some((q) => q.toLowerCase().includes('context/problem')),
    ).toBe(true);
  });
});
