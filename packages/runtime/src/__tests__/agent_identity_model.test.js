"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentIdentity_1 = require("../identity/AgentIdentity");
describe('agent identity model', () => {
    beforeEach(() => {
        (0, AgentIdentity_1.clearIdentityRegistry)();
    });
    it('builds project-scoped identity key and namespace', () => {
        const identity = (0, AgentIdentity_1.buildAgentIdentity)({
            projectId: 'proj-a',
            agentSlug: 'developer',
            workerId: 'worker-1',
        });
        expect(identity.identityKey).toBe('proj-a:developer:worker-1');
        expect(identity.memoryNamespace).toBe('tenant:tenant:proj-a:workspace:workspace:proj-a:project:proj-a:environment:env:tenant:proj-a:workspace:proj-a:project:proj-a:memory:agent:developer');
    });
    it('builds tenant/workspace/environment-scoped memory namespace when scope is provided', () => {
        const identity = (0, AgentIdentity_1.buildAgentIdentity)({
            projectId: 'proj-a',
            agentSlug: 'developer',
            workerId: 'worker-1',
            tenantId: 'tenant-a',
            workspaceId: 'workspace-a',
            environmentId: 'env-a',
        });
        expect(identity.identityKey).toBe('proj-a:developer:worker-1');
        expect(identity.memoryNamespace).toBe('tenant:tenant-a:workspace:workspace-a:project:proj-a:environment:env-a:memory:agent:developer');
    });
    it('allows same worker id within same project', () => {
        const one = (0, AgentIdentity_1.buildAgentIdentity)({ projectId: 'proj-a', agentSlug: 'developer', workerId: 'worker-1' });
        const two = (0, AgentIdentity_1.buildAgentIdentity)({ projectId: 'proj-a', agentSlug: 'research-agent', workerId: 'worker-1' });
        expect((0, AgentIdentity_1.assertWorkerProjectIsolation)(one).ok).toBe(true);
        expect((0, AgentIdentity_1.assertWorkerProjectIsolation)(two).ok).toBe(true);
    });
    it('blocks worker id collision across projects', () => {
        const one = (0, AgentIdentity_1.buildAgentIdentity)({ projectId: 'proj-a', agentSlug: 'developer', workerId: 'worker-1' });
        const two = (0, AgentIdentity_1.buildAgentIdentity)({ projectId: 'proj-b', agentSlug: 'developer', workerId: 'worker-1' });
        expect((0, AgentIdentity_1.assertWorkerProjectIsolation)(one).ok).toBe(true);
        const second = (0, AgentIdentity_1.assertWorkerProjectIsolation)(two);
        expect(second.ok).toBe(false);
        expect(String(second.reason || '')).toContain('worker_id_collision_across_projects');
    });
});
