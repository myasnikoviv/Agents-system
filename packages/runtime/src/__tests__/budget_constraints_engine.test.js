"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CostOptimizationEngine_1 = require("../cost/CostOptimizationEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'budget-engine-'));
}
function seedLedger(workspace, runId, tokens) {
    const ledgerDir = path_1.default.join(workspace, 'docs/process/runs/ledger');
    fs_1.default.mkdirSync(ledgerDir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(ledgerDir, `${runId}.jsonl`), [
        JSON.stringify({
            type: 'llm.response',
            actor: { id: 'developer' },
            payload: { tokensInput: tokens, tokensOutput: 0, source: 'agent', stageId: 'implementation' },
        }),
    ].join('\n') + '\n', 'utf-8');
}
describe('BudgetConstraintsEngine', () => {
    it('supports budget ok, soft exceed, and hard exceed states', () => {
        const workspace = mkTmpWorkspace();
        const budgetPolicyPath = path_1.default.join(workspace, 'docs/runtime/cost/budget-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(budgetPolicyPath), { recursive: true });
        fs_1.default.writeFileSync(budgetPolicyPath, JSON.stringify({
            defaultMaxCostUsdPerRun: 0.01,
            defaultSoftDegradeRatio: 0.8,
        }, null, 2), 'utf-8');
        const costPolicyPath = path_1.default.join(workspace, 'docs/runtime/cost/cost-policy.json');
        fs_1.default.writeFileSync(costPolicyPath, JSON.stringify({
            rates: {
                per1kTokensUsd: 1.0,
                perToolExecutionUsd: 0,
                perRuntimeSecondUsd: 0,
            },
        }, null, 2), 'utf-8');
        seedLedger(workspace, 'run-ok', 5); // $0.005
        const okMetrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, 'run-ok', 'proj');
        const ok = (0, CostOptimizationEngine_1.enforceBudgetConstraints)(okMetrics, workspace);
        expect(ok.allowed).toBe(true);
        expect(ok.softExceeded).toBe(false);
        seedLedger(workspace, 'run-soft', 9); // $0.009
        const softMetrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, 'run-soft', 'proj');
        const soft = (0, CostOptimizationEngine_1.enforceBudgetConstraints)(softMetrics, workspace);
        expect(soft.allowed).toBe(true);
        expect(soft.softExceeded).toBe(true);
        expect(soft.reason).toContain('soft_budget_exceeded');
        seedLedger(workspace, 'run-hard', 11); // $0.011
        const hardMetrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, 'run-hard', 'proj');
        const hard = (0, CostOptimizationEngine_1.enforceBudgetConstraints)(hardMetrics, workspace);
        expect(hard.allowed).toBe(false);
        expect(hard.softExceeded).toBe(true);
        expect(hard.reason).toContain('hard_budget_exceeded');
    });
});
