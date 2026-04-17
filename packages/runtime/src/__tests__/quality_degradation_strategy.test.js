"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const AdaptiveIntelligenceEngine_1 = require("../adaptive/AdaptiveIntelligenceEngine");
const ChainPruningEngine_1 = require("../optimization/ChainPruningEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'quality-degradation-'));
}
describe('Quality degradation strategy', () => {
    it('degrades to cheaper models and shorter/fewer chains under constrained budget', () => {
        const workspace = mkTmpWorkspace();
        const routingPolicyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/routing-policies.json');
        fs_1.default.mkdirSync(path_1.default.dirname(routingPolicyPath), { recursive: true });
        fs_1.default.writeFileSync(routingPolicyPath, JSON.stringify({
            mode: 'balanced',
            modes: {
                cost_saver: { maxTier: 'cheap' },
                balanced: { maxTier: 'medium', minTier: 'cheap' },
                quality_first: { minTier: 'medium' },
            },
            governanceAware: {
                enabled: true,
                on: {
                    constrained: { maxTier: 'cheap' },
                },
            },
        }, null, 2), 'utf-8');
        const routed = (0, AdaptiveIntelligenceEngine_1.applyRoutingPolicies)({
            workspacePath: workspace,
            mode: 'cost_saver',
            governanceSignal: 'constrained',
            decision: {
                runId: 'r1',
                projectId: 'p1',
                taskType: 'design',
                modelTier: 'expensive',
                model: 'gpt-4.1',
                reason: 'base',
            },
        });
        expect(routed.modelTier).toBe('cheap');
        const stages = Array.from({ length: 12 }).map((_, i) => ({ id: String(i + 1), agent: 'developer', enabled: true }));
        const normal = (0, ChainPruningEngine_1.pruneExecutionChain)({ workspacePath: workspace, stages });
        const degraded = (0, ChainPruningEngine_1.pruneExecutionChain)({ workspacePath: workspace, stages, maxStagesOverride: 6 });
        expect(normal.afterCount).toBeLessThanOrEqual(12);
        expect(degraded.afterCount).toBeLessThanOrEqual(6);
        expect(degraded.afterCount).toBeLessThanOrEqual(normal.afterCount);
    });
});
