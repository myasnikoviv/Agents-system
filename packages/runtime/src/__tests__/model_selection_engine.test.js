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
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's33-model-router-'));
}
describe('Model selection engine (Sprint 33)', () => {
    it('applies cheap-first strategy, quality tiers, and deterministic fallback', () => {
        const workspace = mkTmpWorkspace();
        const policyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/model-routing-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({
            defaultTier: 'medium',
            taskTypeToTier: {
                classification: 'cheap',
                design: 'expensive',
                general: 'medium',
            },
            tierToModel: {
                cheap: 'gemini-2.5-flash',
                medium: 'gpt-4o',
                expensive: 'gpt-4.1',
            },
            fallbackByTier: {
                cheap: ['gemini-2.5-flash'],
                medium: ['gpt-4o', 'gemini-2.5-flash'],
                expensive: ['gpt-4.1', 'gpt-4o', 'gemini-2.5-flash'],
            },
            unavailableModels: ['gpt-4.1'],
        }, null, 2), 'utf-8');
        const cheap = (0, AdaptiveIntelligenceEngine_1.routeModelForTask)({
            workspacePath: workspace,
            runId: 'run-1',
            projectId: 'proj',
            userMessage: 'classify and route this quickly',
        });
        expect(cheap.modelTier).toBe('cheap');
        expect(cheap.model).toBe('gemini-2.5-flash');
        const expensive = (0, AdaptiveIntelligenceEngine_1.routeModelForTask)({
            workspacePath: workspace,
            runId: 'run-2',
            projectId: 'proj',
            userMessage: 'need architecture design for this subsystem',
        });
        expect(expensive.modelTier).toBe('expensive');
        expect(expensive.model).toBe('gpt-4o');
    });
});
