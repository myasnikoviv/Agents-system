"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const StepDedupEngine_1 = require("../optimization/StepDedupEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'step-dedup-'));
}
describe('StepDedupEngine', () => {
    it('generates same key for semantically duplicate steps', () => {
        const workspace = mkTmpWorkspace();
        const key1 = (0, StepDedupEngine_1.buildStepDedupKey)({
            workspacePath: workspace,
            pipelineId: 'new-feature',
            agentSlug: 'developer',
            userInput: 'Fix timeout in API',
            stage: { id: '7', title: 'Implement fix' },
        });
        const key2 = (0, StepDedupEngine_1.buildStepDedupKey)({
            workspacePath: workspace,
            pipelineId: 'new-feature',
            agentSlug: 'developer',
            userInput: '  fix timeout in api  ',
            stage: { id: '8', title: 'Implement   fix' },
        });
        expect(typeof key1).toBe('string');
        expect(key1).toBe(key2);
    });
    it('can be disabled via policy', () => {
        const workspace = mkTmpWorkspace();
        const policyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/chain-optimization-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({ enabled: false }, null, 2), 'utf-8');
        const key = (0, StepDedupEngine_1.buildStepDedupKey)({
            workspacePath: workspace,
            pipelineId: 'new-feature',
            agentSlug: 'developer',
            userInput: 'fix',
            stage: { id: '1', title: 'Fix' },
        });
        expect(key).toBeNull();
    });
});
