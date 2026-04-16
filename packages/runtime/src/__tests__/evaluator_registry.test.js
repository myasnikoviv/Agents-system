"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const governance_1 = require("@system/governance");
const governance_2 = require("@system/governance");
describe('EvaluatorRegistry', () => {
    beforeEach(() => {
        (0, governance_1.resetEvaluatorRegistry)();
    });
    it('blocks overriding builtin evaluator without explicit allow flag', async () => {
        const builtins = (0, governance_2.listDeterministicEvaluators)();
        expect(builtins.some((row) => row.evaluatorType === 'preflight_token')).toBe(true);
        const result = (0, governance_1.registerEvaluator)({
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
        (0, governance_2.listDeterministicEvaluators)();
        const base = (0, governance_1.resolveEvaluator)('postflight_report');
        expect(typeof base).toBe('function');
        const result = (0, governance_1.registerEvaluator)({
            evaluatorType: 'postflight_report_custom',
            source: 'plugin',
            evaluate: base,
        });
        expect(result.ok).toBe(true);
        const rows = (0, governance_1.listEvaluators)();
        expect(rows.some((row) => row.evaluatorType === 'postflight_report_custom' && row.isBuiltin === false)).toBe(true);
    });
});
