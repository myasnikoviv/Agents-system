export type AbacRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AbacPolicyDefinition {
  id: string;
  actions: string[];
  allowedRoles: AbacRole[];
  constraints: {
    tenantScope?: 'auth_only' | 'any';
    workspaceScope?: 'auth_only' | 'any';
  };
}

export interface AbacEvaluationInput {
  action: string;
  role: AbacRole;
  authTenantId?: string;
  authWorkspaceId?: string;
  requestedTenantId?: string;
  requestedWorkspaceId?: string;
}

export interface AbacEvaluationResult {
  allowed: boolean;
  policyId: string;
  reason: string;
}

export const DEFAULT_ABAC_POLICIES: AbacPolicyDefinition[] = [
  {
    id: 'abac.owner.full_access',
    actions: ['*'],
    allowedRoles: ['owner'],
    constraints: {
      tenantScope: 'any',
      workspaceScope: 'any',
    },
  },
  {
    id: 'abac.admin.config_write',
    actions: ['config:write', 'governance:write', 'secrets:write'],
    allowedRoles: ['admin'],
    constraints: {
      tenantScope: 'auth_only',
      workspaceScope: 'auth_only',
    },
  },
  {
    id: 'abac.member.runtime_ops',
    actions: ['runtime:read', 'runtime:write', 'config:read'],
    allowedRoles: ['member', 'admin'],
    constraints: {
      tenantScope: 'auth_only',
      workspaceScope: 'auth_only',
    },
  },
  {
    id: 'abac.viewer.read_only',
    actions: ['runtime:read', 'config:read'],
    allowedRoles: ['viewer', 'member', 'admin', 'owner'],
    constraints: {
      tenantScope: 'auth_only',
      workspaceScope: 'auth_only',
    },
  },
];

function actionMatches(policy: AbacPolicyDefinition, action: string): boolean {
  return policy.actions.includes('*') || policy.actions.includes(action);
}

function roleAllowed(policy: AbacPolicyDefinition, role: AbacRole): boolean {
  return policy.allowedRoles.includes(role);
}

function scopeAllowed(input: AbacEvaluationInput, policy: AbacPolicyDefinition): { ok: true } | { ok: false; reason: string } {
  if (policy.constraints.tenantScope === 'auth_only') {
    const requestedTenant = String(input.requestedTenantId || '').trim();
    const authTenant = String(input.authTenantId || '').trim();
    if (requestedTenant && authTenant && requestedTenant !== authTenant) {
      return { ok: false, reason: 'tenant_scope_violation' };
    }
  }
  if (policy.constraints.workspaceScope === 'auth_only') {
    const requestedWorkspace = String(input.requestedWorkspaceId || '').trim();
    const authWorkspace = String(input.authWorkspaceId || '').trim();
    if (requestedWorkspace && authWorkspace && requestedWorkspace !== authWorkspace) {
      return { ok: false, reason: 'workspace_scope_violation' };
    }
  }
  return { ok: true };
}

export function evaluateAbacPolicyAccess(
  input: AbacEvaluationInput,
  policies: AbacPolicyDefinition[] = DEFAULT_ABAC_POLICIES,
): AbacEvaluationResult {
  for (const policy of policies) {
    if (!actionMatches(policy, input.action)) continue;
    if (!roleAllowed(policy, input.role)) continue;
    const scope = scopeAllowed(input, policy);
    if (!scope.ok) {
      return {
        allowed: false,
        policyId: policy.id,
        reason: scope.reason,
      };
    }
    return {
      allowed: true,
      policyId: policy.id,
      reason: 'allow',
    };
  }
  return {
    allowed: false,
    policyId: 'abac.default_deny',
    reason: 'no_matching_policy',
  };
}
