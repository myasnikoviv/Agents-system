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
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'cost-int-'));
}
function seedLedger(workspace, runId, tokenIn, tokenOut) {
    const ledgerDir = path_1.default.join(workspace, 'docs/process/runs/ledger');
    fs_1.default.mkdirSync(ledgerDir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(ledgerDir, `${runId}.jsonl`), [
        JSON.stringify({
            type: 'llm.response',
            actor: { id: 'developer' },
            payload: { tokensInput: tokenIn, tokensOutput: tokenOut, source: 'agent', stageId: 'implementation' },
        }),
        JSON.stringify({ type: 'usage.tool_execution', payload: { quantity: 1, unit: 'calls' } }),
        JSON.stringify({ type: 'usage.runtime_time', payload: { quantity: 2, unit: 'seconds' } }),
    ].join('\n') + '\n', 'utf-8');
}
describe('Cost tracking integration', () => {
    it('tracks per-run + per-step and aggregates costs by project', () => {
        const workspace = mkTmpWorkspace();
        seedLedger(workspace, 'run-a', 100, 50);
        seedLedger(workspace, 'run-b', 200, 100);
        const metricsA = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, 'run-a', 'proj-a');
        const metricsB = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, 'run-b', 'proj-a');
        expect(metricsA.monetary.totalCostUsd).toBeGreaterThan(0);
        expect(metricsA.monetary.byStepUsd.implementation).toBeGreaterThan(0);
        expect(metricsB.monetary.totalCostUsd).toBeGreaterThan(metricsA.monetary.totalCostUsd);
        (0, CostOptimizationEngine_1.writeCostLedger)(metricsA, workspace);
        (0, CostOptimizationEngine_1.writeCostLedger)(metricsB, workspace);
        const aggregated = (0, CostOptimizationEngine_1.aggregateCostLedgers)(workspace, { projectId: 'proj-a' });
        expect(aggregated.runs).toBe(2);
        expect(aggregated.totals.tokens).toBe(450);
        expect(aggregated.totals.toolExecutions).toBe(2);
        expect(aggregated.totals.runtimeSeconds).toBe(4);
        expect(aggregated.totals.totalCostUsd).toBeGreaterThan(0);
        expect(aggregated.byProject['proj-a'].runs).toBe(2);
    });
});
