"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const SemanticCache_1 = require("../optimization/SemanticCache");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'semantic-cache-'));
}
describe('SemanticCache (MVP)', () => {
    it('reuses output for similar inputs with configurable threshold', () => {
        const workspace = mkTmpWorkspace();
        const policyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/semantic-cache-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({
            enabled: true,
            threshold: 0.5,
            ttlSeconds: 600,
            maxEntriesPerBucket: 20,
        }, null, 2), 'utf-8');
        const bucket = (0, SemanticCache_1.buildSemanticCacheBucket)({
            pipelineId: 'new-feature',
            agentSlug: 'developer',
            stage: { id: '1', title: 'Implement fix' },
        });
        (0, SemanticCache_1.setSemanticCacheEntry)({
            workspacePath: workspace,
            bucket,
            prompt: 'fix timeout in backend api',
            response: 'patched timeout handling',
            nowMs: 1000,
        });
        const hit = (0, SemanticCache_1.getSemanticCacheHit)({
            workspacePath: workspace,
            bucket,
            query: 'please fix timeout in api backend',
            nowMs: 1200,
        });
        expect(hit.hit).toBe(true);
        expect(hit.response).toContain('patched');
        expect(Number(hit.score || 0)).toBeGreaterThanOrEqual(0.5);
    });
    it('misses when similarity is below threshold', () => {
        const workspace = mkTmpWorkspace();
        const policyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/semantic-cache-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({ threshold: 0.95 }, null, 2), 'utf-8');
        const bucket = (0, SemanticCache_1.buildSemanticCacheBucket)({
            pipelineId: 'new-feature',
            agentSlug: 'developer',
            stage: { id: '1', title: 'Implement fix' },
        });
        (0, SemanticCache_1.setSemanticCacheEntry)({
            workspacePath: workspace,
            bucket,
            prompt: 'fix timeout in backend api',
            response: 'patched timeout handling',
            nowMs: 1000,
        });
        const miss = (0, SemanticCache_1.getSemanticCacheHit)({
            workspacePath: workspace,
            bucket,
            query: 'design dashboard ui and fonts',
            nowMs: 1200,
        });
        expect(miss.hit).toBe(false);
    });
});
