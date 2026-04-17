"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const AdaptiveIntelligenceEngine_1 = require("../adaptive/AdaptiveIntelligenceEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'routing-policy-'));
}
describe('Routing policies (cost vs quality)', () => {
    it('applies configurable tradeoff mode and governance-aware cap', () => {
        const workspace = mkTmpWorkspace();
        const file = path_1.default.join(workspace, 'docs/runtime/adaptive/routing-policies.json');
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        fs_1.default.writeFileSync(file, JSON.stringify({
            mode: 'quality_first',
            modes: {
                cost_saver: { maxTier: 'cheap' },
                balanced: { maxTier: 'medium', minTier: 'cheap' },
                quality_first: { minTier: 'medium' },
            },
            governanceAware: {
                enabled: true,
                on: {
                    caution: { maxTier: 'medium' },
                    constrained: { maxTier: 'cheap' },
                },
            },
        }, null, 2), 'utf-8');
        const qualityFirst = (0, AdaptiveIntelligenceEngine_1.applyRoutingPolicies)({
            workspacePath: workspace,
            mode: 'quality_first',
            governanceSignal: 'normal',
            decision: {
                runId: 'r1',
                projectId: 'p1',
                taskType: 'general',
                modelTier: 'cheap',
                model: 'gpt-4o-mini',
                reason: 'base',
            },
        });
        expect(qualityFirst.modelTier).toBe('medium');
        const constrained = (0, AdaptiveIntelligenceEngine_1.applyRoutingPolicies)({
            workspacePath: workspace,
            mode: 'quality_first',
            governanceSignal: 'constrained',
            decision: {
                runId: 'r2',
                projectId: 'p1',
                taskType: 'design',
                modelTier: 'expensive',
                model: 'gpt-4.1',
                reason: 'base',
            },
        });
        expect(constrained.modelTier).toBe('cheap');
    });
});
