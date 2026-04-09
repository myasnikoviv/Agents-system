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
    expect(identity.memoryNamespace).toBe('memory:proj-a:developer');
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

