"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ChainPruningEngine_1 = require("../optimization/ChainPruningEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'chain-pruning-'));
}
describe('ChainPruningEngine', () => {
    it('removes redundant stages and reports measurable LLM-call reduction', () => {
        const workspace = mkTmpWorkspace();
        const policyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/chain-optimization-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({
            dedupeByStageId: true,
            dedupeConsecutiveByAgent: true,
            dropDisabledStages: true,
            maxStagesPerRun: 10,
        }, null, 2), 'utf-8');
        const stages = [
            { id: '1', agent: 'pm-orchestrator', enabled: true },
            { id: '1', agent: 'pm-orchestrator', enabled: true },
            { id: '2', agent: 'developer', enabled: true },
            { id: '3', agent: 'developer', enabled: true },
            { id: '4', agent: 'qa', enabled: false },
            { id: '5', agent: 'qa', enabled: true },
        ];
        const result = (0, ChainPruningEngine_1.pruneExecutionChain)({ workspacePath: workspace, stages });
        expect(result.beforeCount).toBe(6);
        expect(result.afterCount).toBe(3);
        expect(result.prunedCount).toBe(3);
        expect(result.measurableImprovementPct).toBe(50);
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.stages.map((s) => String(s.id))).toEqual(['1', '2', '5']);
        const report = (0, ChainPruningEngine_1.writeChainPruningReport)(workspace, 'run-prune-1', {
            pipelineId: 'new-feature',
            beforeCount: result.beforeCount,
            afterCount: result.afterCount,
            prunedCount: result.prunedCount,
            estimatedLlmCallsBefore: result.estimatedLlmCallsBefore,
            estimatedLlmCallsAfter: result.estimatedLlmCallsAfter,
            measurableImprovementPct: result.measurableImprovementPct,
            reasons: result.reasons,
        });
        expect(fs_1.default.existsSync(report)).toBe(true);
    });
});
