"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const governance_1 = require("@system/governance");
function mkWorkspace() {
    const root = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'gov-loop-'));
    fs_1.default.mkdirSync(path_1.default.join(root, 'docs/runtime/governance'), { recursive: true });
    return root;
}
describe('LoopRegistry lifecycle', () => {
    it('creates, updates and disables loop entities', () => {
        const workspace = mkWorkspace();
        const created = (0, governance_1.createGovernanceLoop)({
            id: 'improvement_default',
            kind: 'improvement',
            enabledByDefault: true,
            scope: { level: 'project', projectId: 'agent_system' },
        }, workspace);
        expect(created.id).toBe('improvement_default');
        const updated = (0, governance_1.updateGovernanceLoop)('improvement_default', {
            config: { maxRetries: 3 },
            metadata: {
                name: 'Improvement',
                description: 'Project improvement loop',
                version: '1.0.0',
                owner: 'system',
                tags: ['default'],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        }, workspace);
        expect(updated.config?.maxRetries).toBe(3);
        const disabled = (0, governance_1.disableGovernanceLoop)('improvement_default', { disabled: true }, workspace);
        expect(disabled.disabled).toBe(true);
        const byId = (0, governance_1.getGovernanceLoopById)('improvement_default', workspace);
        expect(byId?.disabled).toBe(true);
        const list = (0, governance_1.loadGovernanceLoops)(workspace);
        expect(list).toHaveLength(1);
    });
    it('resolves loop runnable state by scope', () => {
        const loop = {
            id: 'validation_session',
            kind: 'validation',
            enabledByDefault: true,
            scope: { level: 'session', projectId: 'p1', sessionId: 'thread-1' },
        };
        expect((0, governance_1.isGovernanceLoopRunnable)(loop, { projectId: 'p1', chainId: 'thread-1' })).toBe(true);
        expect((0, governance_1.isGovernanceLoopRunnable)(loop, { projectId: 'p2', chainId: 'thread-1' })).toBe(false);
        expect((0, governance_1.isGovernanceLoopRunnable)(loop, { projectId: 'p1', chainId: 'thread-2' })).toBe(false);
    });
});
