"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ToolResultCache_1 = require("../optimization/ToolResultCache");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'tool-cache-'));
}
describe('ToolResultCache', () => {
    it('caches deterministic tool results and reuses them', () => {
        const workspace = mkTmpWorkspace();
        const key = (0, ToolResultCache_1.buildToolCacheKey)({
            toolId: 'read_file',
            args: { path: 'README.md' },
            scopeLevel: 'workspace',
            tenantId: 't1',
            workspaceId: 'w1',
        });
        (0, ToolResultCache_1.setToolResultToCache)({
            workspacePath: workspace,
            key,
            content: 'hello',
            nowMs: 1000,
        });
        const hit = (0, ToolResultCache_1.getToolResultFromCache)({
            workspacePath: workspace,
            key,
            nowMs: 1200,
        });
        expect(hit.hit).toBe(true);
        expect(hit.content).toBe('hello');
    });
    it('honors cacheability constraints (safe + allowlist)', () => {
        const workspace = mkTmpWorkspace();
        expect((0, ToolResultCache_1.isDeterministicToolCacheable)({
            workspacePath: workspace,
            toolId: 'read_file',
            policy: { id: 'read_file', type: 'parallel', allowedAgents: ['*'], risk: 'safe', scope: { level: 'global' } },
        })).toBe(true);
        expect((0, ToolResultCache_1.isDeterministicToolCacheable)({
            workspacePath: workspace,
            toolId: 'filesystem',
            policy: { id: 'filesystem', type: 'exclusive', allowedAgents: ['*'], risk: 'mutable', scope: { level: 'workspace' } },
        })).toBe(false);
    });
});
