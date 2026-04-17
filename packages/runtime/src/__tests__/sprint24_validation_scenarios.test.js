"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const governance_1 = require("@system/governance");
const governance_2 = require("@system/governance");
const governance_3 = require("@system/governance");
function mkWorkspace() {
    const root = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's24-validation-'));
    fs_1.default.mkdirSync(path_1.default.join(root, 'docs/runtime/governance'), { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(root, 'docs/runtime/governance/rule-registry.yaml'), [
        'rules:',
        '  - id: git_preflight',
        '    triggerPhases: [BEFORE_RUN]',
        '    evidence: [docs/process/git/preflights/<ticket>.env]',
        '    evaluationType: deterministic',
        '    deterministicCheck: preflight_token',
        '    enforcementMode: hard',
        '    enabledByDefault: true',
        '',
    ].join('\n'), 'utf-8');
    return root;
}
describe('Sprint24 validation scenarios', () => {
    it('10.1 marketing project can disable git_preflight via project policy', () => {
        const workspace = mkWorkspace();
        (0, governance_2.updateProjectPolicy)('marketing', { disabledRules: ['git_preflight'] }, workspace);
        const enabled = (0, governance_2.resolveEnabledRules)('marketing', workspace);
        expect(enabled.has('git_preflight')).toBe(false);
    });
    it('10.2 add new rule with existing evaluator and enable in project', () => {
        const workspace = mkWorkspace();
        (0, governance_1.createGovernanceRule)({
            id: 'postflight_quality_gate',
            triggerPhases: ['AFTER_RUN'],
            evidence: ['docs/process/tests/<ticket>.md'],
            evaluationType: 'deterministic',
            deterministicCheck: 'postflight_report',
            enforcementMode: 'soft',
            enabledByDefault: false,
        }, workspace);
        const rules = (0, governance_1.loadGovernanceRules)(workspace);
        expect(rules.some((r) => r.id === 'postflight_quality_gate')).toBe(true);
        (0, governance_2.updateProjectPolicy)('agent_system', { enabledRules: ['git_preflight', 'postflight_quality_gate'] }, workspace);
        const enabled = (0, governance_2.resolveEnabledRules)('agent_system', workspace);
        expect(enabled.has('postflight_quality_gate')).toBe(true);
    });
    it('10.3 threshold override remains project-scoped', () => {
        const workspace = mkWorkspace();
        (0, governance_1.createGovernanceRule)({
            id: 'cost_guard_light',
            triggerPhases: ['AFTER_RUN'],
            evidence: ['docs/process/runs/cost/<project>.json'],
            evaluationType: 'deterministic',
            deterministicCheck: 'cost_tracker',
            enforcementMode: 'soft',
            enabledByDefault: true,
            thresholds: { dailyUsd: 10 },
        }, workspace);
        (0, governance_2.updateProjectPolicy)('project-a', {
            ruleOverrides: { cost_guard_light: { thresholds: { dailyUsd: 5 } } },
        }, workspace);
        const policyA = (0, governance_2.getProjectPolicy)('project-a', workspace);
        const policyB = (0, governance_2.getProjectPolicy)('project-b', workspace);
        expect(policyA.ruleOverrides.cost_guard_light?.thresholds?.dailyUsd).toBe(5);
        expect(policyB.ruleOverrides.cost_guard_light).toBeUndefined();
    });
    it('10.4 disable system rule for one project only', () => {
        const workspace = mkWorkspace();
        (0, governance_2.updateProjectPolicy)('project-a', { disabledRules: ['git_preflight'] }, workspace);
        const aEnabled = (0, governance_2.resolveEnabledRules)('project-a', workspace);
        const bEnabled = (0, governance_2.resolveEnabledRules)('project-b', workspace);
        expect(aEnabled.has('git_preflight')).toBe(false);
        expect(bEnabled.has('git_preflight')).toBe(true);
    });
    it('loop entities are first-class, scoped and manually runnable-gated', () => {
        const workspace = mkWorkspace();
        (0, governance_3.createGovernanceLoop)({
            id: 'validation_session',
            kind: 'validation',
            enabledByDefault: true,
            scope: { level: 'session', projectId: 'project-a', sessionId: 'thread-1' },
        }, workspace);
        const hit = (0, governance_3.isGovernanceLoopRunnable)({ id: 'validation_session', kind: 'validation', enabledByDefault: true, scope: { level: 'session', projectId: 'project-a', sessionId: 'thread-1' } }, { projectId: 'project-a', chainId: 'thread-1' });
        const miss = (0, governance_3.isGovernanceLoopRunnable)({ id: 'validation_session', kind: 'validation', enabledByDefault: true, scope: { level: 'session', projectId: 'project-a', sessionId: 'thread-1' } }, { projectId: 'project-a', chainId: 'thread-2' });
        expect(hit).toBe(true);
        expect(miss).toBe(false);
        const disabled = (0, governance_3.disableGovernanceLoop)('validation_session', { disabled: true }, workspace);
        expect(disabled.disabled).toBe(true);
    });
});
