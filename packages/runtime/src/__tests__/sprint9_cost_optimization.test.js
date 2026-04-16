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
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's9-cost-'));
}
function seedLedger(workspace, runId) {
    const dir = path_1.default.join(workspace, 'docs/process/runs/ledger');
    fs_1.default.mkdirSync(dir, { recursive: true });
    const events = [
        {
            type: 'llm.response',
            actor: { type: 'agent', id: 'coder-a' },
            payload: { tokensInput: 100, tokensOutput: 50, source: 'agent', stageId: 'implementation' },
        },
        { type: 'llm.response', payload: { tokensInput: 20, tokensOutput: 10, source: 'guard', stageId: 'governance' } },
        { type: 'guard.retry', payload: { stepId: 'x', attempt: 1 } },
        { type: 'governance.rule_check', payload: { rule: 'improvement_loop' } },
    ];
    fs_1.default.writeFileSync(path_1.default.join(dir, `${runId}.jsonl`), events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
}
function test_run_level_cost_tracker_and_breakdown() {
    const workspace = mkTmpWorkspace();
    const runId = 'run-s9-1';
    seedLedger(workspace, runId);
    const metrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, runId, 'agent_system');
    console.assert(metrics.tokens === 180, 'expected token sum 180');
    console.assert(metrics.retries === 1, 'expected one retry');
    console.assert(metrics.loops === 1, 'expected one loop');
    console.assert(metrics.breakdown.execution === 150, 'expected execution token bucket');
    console.assert(metrics.breakdown.governance === 30, 'expected governance token bucket');
    console.assert(metrics.attribution.byAgent['coder-a'] === 150, 'expected attribution by agent');
    console.assert(metrics.attribution.byStep['implementation'] === 150, 'expected attribution by step implementation');
    console.log('[PASS] S9 run-level tracker + breakdown');
}
function test_hard_cost_limit() {
    const workspace = mkTmpWorkspace();
    const runId = 'run-s9-2';
    seedLedger(workspace, runId);
    const metrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, runId, 'agent_system');
    const allow = (0, CostOptimizationEngine_1.enforceHardCostLimit)(metrics, workspace);
    console.assert(allow.allowed === true, 'default threshold should allow 180 tokens');
    const policyFile = path_1.default.join(workspace, 'docs/runtime/cost/cost-policy.json');
    fs_1.default.mkdirSync(path_1.default.dirname(policyFile), { recursive: true });
    fs_1.default.writeFileSync(policyFile, JSON.stringify({ defaultHardTokenLimit: 100, byProject: { agent_system: { hardTokenLimit: 100 } } }, null, 2), 'utf-8');
    const blocked = (0, CostOptimizationEngine_1.enforceHardCostLimit)(metrics, workspace);
    console.assert(blocked.allowed === false, 'hard limit should block over threshold');
    console.log('[PASS] S9 hard cost limits');
}
function test_cost_ledger_and_adaptive() {
    const workspace = mkTmpWorkspace();
    const runId = 'run-s9-3';
    seedLedger(workspace, runId);
    const metrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, runId, 'agent_system');
    const file = (0, CostOptimizationEngine_1.writeCostLedger)(metrics, workspace);
    console.assert(fs_1.default.existsSync(file), 'cost ledger should exist');
    // create a few low-retry histories
    const costDir = path_1.default.join(workspace, 'docs/process/runs/cost');
    fs_1.default.writeFileSync(path_1.default.join(costDir, 'run-a.json'), JSON.stringify({ projectId: 'agent_system', retries: 0 }), 'utf-8');
    fs_1.default.writeFileSync(path_1.default.join(costDir, 'run-b.json'), JSON.stringify({ projectId: 'agent_system', retries: 0 }), 'utf-8');
    const adaptive = (0, CostOptimizationEngine_1.decideAdaptiveOptimization)(workspace, 'agent_system');
    console.assert(adaptive.lowRisk === true, 'expected low-risk adaptive profile');
    console.assert(adaptive.suggestedMaxRetriesPerStep === 1, 'expected retry=1 for low-risk');
    console.log('[PASS] S9 cost ledger + adaptive optimization');
}
(async () => {
    console.log('\n=== Sprint 9 Cost Optimization Tests ===\n');
    test_run_level_cost_tracker_and_breakdown();
    test_hard_cost_limit();
    test_cost_ledger_and_adaptive();
    console.log('\n=== Sprint 9 cost optimization tests completed successfully ===\n');
    process.exit(0);
})();
