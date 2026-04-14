import { listEvaluators, registerEvaluator, resetEvaluatorRegistry, resolveEvaluator } from '../governance/EvaluatorRegistry';
import { listDeterministicEvaluators } from '../governance/DeterministicEvaluationEngine';

describe('EvaluatorRegistry', () => {
  beforeEach(() => {
    resetEvaluatorRegistry();
  });

  it('blocks overriding builtin evaluator without explicit allow flag', async () => {
    const builtins = listDeterministicEvaluators();
    expect(builtins.some((row) => row.evaluatorType === 'preflight_token')).toBe(true);

    const result = registerEvaluator({
      evaluatorType: 'preflight_token',
      source: 'plugin',
      evaluate: async (rule) => ({
        ruleId: rule.id,
        verdict: 'pass',
        reason: 'override',
        evidenceSummary: 'override',
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.reason).toBe('builtin_override_blocked');
    }
  });

  it('allows registering plugin evaluator alias safely', async () => {
    listDeterministicEvaluators();
    const base = resolveEvaluator('postflight_report');
    expect(typeof base).toBe('function');

    const result = registerEvaluator({
      evaluatorType: 'postflight_report_custom',
      source: 'plugin',
      evaluate: base!,
    });

    expect(result.ok).toBe(true);
    const rows = listEvaluators();
    expect(rows.some((row) => row.evaluatorType === 'postflight_report_custom' && row.isBuiltin === false)).toBe(true);
  });
});
