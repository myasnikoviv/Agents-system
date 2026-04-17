import {
  assertWorkerProjectIsolation,
  buildAgentIdentity,
  clearIdentityRegistry,
} from '../identity/AgentIdentity';

describe('agent identity model', () => {
  beforeEach(() => {
    clearIdentityRegistry();
  });

  it('builds project-scoped identity key and namespace', () => {
    const identity = buildAgentIdentity({
      projectId: 'proj-a',
      agentSlug: 'developer',
      workerId: 'worker-1',
    });

    expect(identity.identityKey).toBe('proj-a:developer:worker-1');
    expect(identity.memoryNamespace).toBe(
      'tenant:tenant:proj-a:workspace:workspace:proj-a:project:proj-a:environment:env:tenant:proj-a:workspace:proj-a:project:proj-a:memory:agent:developer',
    );
  });

  it('builds tenant/workspace/environment-scoped memory namespace when scope is provided', () => {
    const identity = buildAgentIdentity({
      projectId: 'proj-a',
      agentSlug: 'developer',
      workerId: 'worker-1',
      tenantId: 'tenant-a',
      workspaceId: 'workspace-a',
      environmentId: 'env-a',
    });

    expect(identity.identityKey).toBe('proj-a:developer:worker-1');
    expect(identity.memoryNamespace).toBe(
      'tenant:tenant-a:workspace:workspace-a:project:proj-a:environment:env-a:memory:agent:developer',
    );
  });

  it('allows same worker id within same project', () => {
    const one = buildAgentIdentity({ projectId: 'proj-a', agentSlug: 'developer', workerId: 'worker-1' });
    const two = buildAgentIdentity({ projectId: 'proj-a', agentSlug: 'research-agent', workerId: 'worker-1' });

    expect(assertWorkerProjectIsolation(one).ok).toBe(true);
    expect(assertWorkerProjectIsolation(two).ok).toBe(true);
  });

  it('blocks worker id collision across projects', () => {
    const one = buildAgentIdentity({ projectId: 'proj-a', agentSlug: 'developer', workerId: 'worker-1' });
    const two = buildAgentIdentity({ projectId: 'proj-b', agentSlug: 'developer', workerId: 'worker-1' });

    expect(assertWorkerProjectIsolation(one).ok).toBe(true);
    const second = assertWorkerProjectIsolation(two);
    expect(second.ok).toBe(false);
    expect(String(second.reason || '')).toContain('worker_id_collision_across_projects');
  });
});
