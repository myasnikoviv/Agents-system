import {
  buildEnvironmentId,
  canTransitionEnvironment,
  createEnvironmentRecord,
  transitionEnvironment,
} from '../environment/EnvironmentLifecycle';

describe('EnvironmentLifecycle', () => {
  it('creates deterministic environment identity scoped by tenant/workspace/project', () => {
    const env = createEnvironmentRecord({ tenantId: 'tenant-a', workspaceId: 'workspace-a', projectId: 'project-a' });
    expect(env.environmentId).toBe('env:tenant-a:workspace-a:project:project-a');
    expect(env.state).toBe('provisioning');
  });

  it('defines allowed lifecycle transitions', () => {
    expect(canTransitionEnvironment('provisioning', 'warming')).toBe(true);
    expect(canTransitionEnvironment('warming', 'active')).toBe(true);
    expect(canTransitionEnvironment('active', 'idle')).toBe(true);
    expect(canTransitionEnvironment('terminated', 'active')).toBe(false);
  });

  it('returns transition event log payload on valid transition', () => {
    const env = createEnvironmentRecord({ tenantId: 't1', workspaceId: 'w1' });
    const transitioned = transitionEnvironment(env, 'warming', { reason: 'bootstrap', actorId: 'system-core', now: '2026-04-09T00:00:00.000Z' });
    expect('error' in transitioned).toBe(false);
    if ('error' in transitioned) return;
    expect(transitioned.next.state).toBe('warming');
    expect(transitioned.event.from).toBe('provisioning');
    expect(transitioned.event.to).toBe('warming');
    expect(transitioned.event.reason).toBe('bootstrap');
    expect(transitioned.event.actorId).toBe('system-core');
  });

  it('rejects invalid transition sequence', () => {
    const env = createEnvironmentRecord({ tenantId: 't1', workspaceId: 'w1', initialState: 'terminated' });
    const transitioned = transitionEnvironment(env, 'active');
    expect('error' in transitioned).toBe(true);
    if ('error' in transitioned) {
      expect(transitioned.error).toBe('invalid_transition:terminated->active');
    }
  });

  it('buildEnvironmentId helper supports project-less environments', () => {
    expect(buildEnvironmentId({ tenantId: 't2', workspaceId: 'w2' })).toBe('env:t2:w2');
  });
});
