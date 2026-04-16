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
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'cost-layer-'));
}
describe('CostOptimizationLayer', () => {
    it('collects token/retry metrics and derives adaptive retry policy', () => {
        const workspace = mkTmpWorkspace();
        const ledgerDir = path_1.default.join(workspace, 'docs/process/runs/ledger');
        fs_1.default.mkdirSync(ledgerDir, { recursive: true });
        const runId = 'run-cost-1';
        const ledgerPath = path_1.default.join(ledgerDir, `${runId}.jsonl`);
        fs_1.default.writeFileSync(ledgerPath, [
            JSON.stringify({
                type: 'llm.response',
                actor: { id: 'developer' },
                payload: { tokensInput: 100, tokensOutput: 50, source: 'agent', stageId: 'implementation' },
            }),
            JSON.stringify({
                type: 'llm.response',
                actor: { id: 'pm-orchestrator' },
                payload: { tokensInput: 20, tokensOutput: 10, source: 'guard', stageId: 'governance' },
            }),
            JSON.stringify({ type: 'usage.tool_execution', payload: { quantity: 2, unit: 'calls' } }),
            JSON.stringify({ type: 'usage.runtime_time', payload: { quantity: 3, unit: 'seconds' } }),
            JSON.stringify({ type: 'guard.retry', payload: { attempt: 1 } }),
        ].join('\n') + '\n', 'utf-8');
        const metrics = (0, CostOptimizationEngine_1.collectRunCostMetrics)(workspace, runId, 'proj-a');
        expect(metrics.tokens).toBe(180);
        expect(metrics.toolExecutions).toBe(2);
        expect(metrics.runtimeSeconds).toBe(3);
        expect(metrics.retries).toBe(1);
        expect(metrics.breakdown.execution).toBe(150);
        expect(metrics.breakdown.governance).toBe(30);
        expect(metrics.monetary.currency).toBe('USD');
        expect(metrics.monetary.tokenCostUsd).toBeCloseTo(0.0018, 6);
        expect(metrics.monetary.toolCostUsd).toBeCloseTo(0.002, 6);
        expect(metrics.monetary.runtimeCostUsd).toBeCloseTo(0.0003, 6);
        expect(metrics.monetary.totalCostUsd).toBeCloseTo(0.0041, 6);
        expect(metrics.monetary.rates.per1kTokensUsd).toBeGreaterThan(0);
        expect(metrics.monetary.byAgentUsd.developer).toBeGreaterThan(0);
        expect(metrics.monetary.byStepUsd.implementation).toBeGreaterThan(0);
        const costOutDir = path_1.default.join(workspace, 'docs/process/runs/cost');
        fs_1.default.mkdirSync(costOutDir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(costOutDir, `${runId}.json`), JSON.stringify({ runId, projectId: 'proj-a', retries: 0 }, null, 2), 'utf-8');
        fs_1.default.writeFileSync(path_1.default.join(costOutDir, `run-cost-2.json`), JSON.stringify({ runId: 'run-cost-2', projectId: 'proj-a', retries: 0 }, null, 2), 'utf-8');
        const adaptive = (0, CostOptimizationEngine_1.decideAdaptiveOptimization)(workspace, 'proj-a');
        expect(adaptive.lowRisk).toBe(true);
        expect(adaptive.suggestedMaxRetriesPerStep).toBe(1);
    });
});
