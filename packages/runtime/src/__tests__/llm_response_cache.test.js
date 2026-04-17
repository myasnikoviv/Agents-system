"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const LlmResponseCache_1 = require("../optimization/LlmResponseCache");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'llm-cache-'));
}
describe('LlmResponseCache', () => {
    it('supports cache hit with TTL and deterministic key', () => {
        const workspace = mkTmpWorkspace();
        const key = (0, LlmResponseCache_1.buildLlmResponseCacheKey)({
            pipelineId: 'new-feature',
            stage: { id: '1', title: 'Implement fix' },
            agentSlug: 'developer',
            userInput: 'Fix timeout',
        });
        const key2 = (0, LlmResponseCache_1.buildLlmResponseCacheKey)({
            pipelineId: 'new-feature',
            stage: { id: '2', title: '  implement   fix ' },
            agentSlug: 'developer',
            userInput: ' fix timeout ',
        });
        expect(key).toBe(key2);
        (0, LlmResponseCache_1.setCachedLlmResponse)({
            workspacePath: workspace,
            key,
            value: 'cached answer',
            nowMs: 1000,
        });
        const hit = (0, LlmResponseCache_1.getCachedLlmResponse)({
            workspacePath: workspace,
            key,
            stage: { id: '1' },
            nowMs: 1500,
        });
        expect(hit.hit).toBe(true);
        expect(hit.value).toContain('cached answer');
    });
    it('does not use cache for critical stage by default', () => {
        const workspace = mkTmpWorkspace();
        const key = (0, LlmResponseCache_1.buildLlmResponseCacheKey)({
            pipelineId: 'new-feature',
            stage: { id: '1', title: 'Implement fix' },
            agentSlug: 'developer',
            userInput: 'Fix timeout',
        });
        (0, LlmResponseCache_1.setCachedLlmResponse)({
            workspacePath: workspace,
            key,
            value: 'cached answer',
            nowMs: 1000,
        });
        const miss = (0, LlmResponseCache_1.getCachedLlmResponse)({
            workspacePath: workspace,
            key,
            stage: { id: '1', critical: true },
            nowMs: 1200,
        });
        expect(miss.hit).toBe(false);
    });
});
