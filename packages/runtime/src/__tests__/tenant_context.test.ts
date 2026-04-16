import { resolveTenantScope, tenantNamespace, validateTenantBoundary } from '../tenancy/TenantContext';

describe('TenantContext', () => {
  it('resolves full tenant scope with deterministic defaults', () => {
    const scope = resolveTenantScope({ projectId: 'agent_system', runId: 'run-1', agentSlug: 'developer' });
    expect(scope.tenantId).toBe('tenant:agent_system');
    expect(scope.workspaceId).toBe('workspace:agent_system');
    expect(scope.projectId).toBe('agent_system');
    expect(scope.environmentId).toBe('env:tenant:agent_system:workspace:agent_system:project:agent_system');
    expect(scope.runId).toBe('run-1');
    expect(scope.agentSlug).toBe('developer');
  });

  it('builds namespaced keys with tenant/workspace/project dimensions', () => {
    const scope = resolveTenantScope({
      tenantId: 't-1',
      workspaceId: 'w-1',
      projectId: 'p-1',
      environmentId: 'env-custom',
      runId: 'r-1',
    });
    expect(tenantNamespace(scope, 'memory')).toBe('tenant:t-1:workspace:w-1:project:p-1:environment:env-custom:memory');
    expect(tenantNamespace(scope, 'queue')).toBe('tenant:t-1:workspace:w-1:project:p-1:environment:env-custom:queue');
  });

  it('rejects unsafe boundary identifiers', () => {
    const bad = resolveTenantScope({ tenantId: '../tenant', workspaceId: 'w-1', projectId: 'p-1', runId: 'r-1' });
    const check = validateTenantBoundary(bad);
    expect(check.ok).toBe(false);
  });
});
