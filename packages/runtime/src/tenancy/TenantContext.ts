export interface TenantScopeInput {
  tenantId?: string;
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;
  runId?: string;
  agentSlug?: string;
}

export interface TenantScope {
  tenantId: string;
  workspaceId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  agentSlug?: string;
}

function normalize(value: string | undefined, defaultValue: string): string {
  const v = String(value || '').trim();
  return v || defaultValue;
}

export function resolveTenantScope(input: TenantScopeInput): TenantScope {
  const projectId = normalize(input.projectId, 'default-project');
  const tenantId = normalize(input.tenantId || process.env.DEFAULT_TENANT_ID, `tenant:${projectId}`);
  const workspaceId = normalize(input.workspaceId || process.env.DEFAULT_WORKSPACE_ID, `workspace:${projectId}`);
  const environmentId = normalize(input.environmentId, `env:${tenantId}:${workspaceId}:project:${projectId}`);
  const runId = normalize(input.runId, `run_${Date.now()}`);
  const agentSlug = String(input.agentSlug || '').trim() || undefined;
  return { tenantId, workspaceId, projectId, environmentId, runId, ...(agentSlug ? { agentSlug } : {}) };
}

export function tenantNamespace(scope: TenantScope, domain: 'memory' | 'queue' | 'artifacts' | 'governance'): string {
  return `tenant:${scope.tenantId}:workspace:${scope.workspaceId}:project:${scope.projectId}:environment:${scope.environmentId}:${domain}`;
}

export function validateTenantBoundary(scope: TenantScope): { ok: true } | { ok: false; reason: string } {
  if (!scope.tenantId || !scope.workspaceId || !scope.projectId || !scope.environmentId || !scope.runId) {
    return { ok: false, reason: 'missing_scope_dimension' };
  }
  if (scope.workspaceId.includes('..') || scope.tenantId.includes('..')) {
    return { ok: false, reason: 'unsafe_scope_identifier' };
  }
  return { ok: true };
}
