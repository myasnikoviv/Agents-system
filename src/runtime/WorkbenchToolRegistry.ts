export type WorkbenchAccessMode = 'parallel' | 'exclusive' | 'isolated';
export type WorkbenchScopeLevel = 'global' | 'tenant' | 'workspace' | 'session';
export type WorkbenchToolRisk = 'safe' | 'mutable' | 'unsafe';

export interface WorkbenchScope {
  level: WorkbenchScopeLevel;
  tenantId?: string;
  workspaceId?: string;
  sessionId?: string;
}

export interface WorkbenchToolPolicy {
  id: string;
  type: WorkbenchAccessMode;
  allowedAgents: string[];
  risk?: WorkbenchToolRisk;
  scope?: WorkbenchScope;
}

const DEFAULT_WORKBENCH_POLICIES: WorkbenchToolPolicy[] = [
  { id: 'ls', type: 'parallel', allowedAgents: ['*'], risk: 'safe', scope: { level: 'global' } },
  { id: 'list_dir', type: 'parallel', allowedAgents: ['*'], risk: 'safe', scope: { level: 'global' } },
  { id: 'read_file', type: 'parallel', allowedAgents: ['*'], risk: 'safe', scope: { level: 'global' } },
  { id: 'search_web', type: 'parallel', allowedAgents: ['*'], risk: 'safe', scope: { level: 'global' } },
  { id: 'filesystem', type: 'exclusive', allowedAgents: ['*'], risk: 'mutable', scope: { level: 'workspace' } },
  { id: 'plane', type: 'exclusive', allowedAgents: ['*'], risk: 'mutable', scope: { level: 'workspace' } },
  { id: 'figma', type: 'isolated', allowedAgents: ['*'], risk: 'unsafe', scope: { level: 'session' } },
  { id: 'playwright', type: 'isolated', allowedAgents: ['*'], risk: 'unsafe', scope: { level: 'session' } },
];

const policies = new Map<string, WorkbenchToolPolicy[]>();

export function resetWorkbenchToolRegistry(): void {
  policies.clear();
  for (const policy of DEFAULT_WORKBENCH_POLICIES) {
    const current = policies.get(policy.id) || [];
    current.push(policy);
    policies.set(policy.id, current);
  }
}

export function upsertWorkbenchToolPolicy(policy: WorkbenchToolPolicy): void {
  const current = policies.get(policy.id) || [];
  const next = current.filter((existing) => {
    const existingScope = existing.scope?.level || 'global';
    const incomingScope = policy.scope?.level || 'global';
    if (existingScope !== incomingScope) return true;
    if (incomingScope === 'tenant') return existing.scope?.tenantId !== policy.scope?.tenantId;
    if (incomingScope === 'workspace') {
      return existing.scope?.tenantId !== policy.scope?.tenantId || existing.scope?.workspaceId !== policy.scope?.workspaceId;
    }
    if (incomingScope === 'session') {
      return existing.scope?.tenantId !== policy.scope?.tenantId
        || existing.scope?.workspaceId !== policy.scope?.workspaceId
        || existing.scope?.sessionId !== policy.scope?.sessionId;
    }
    return false;
  });
  next.push(policy);
  policies.set(policy.id, next);
}

export function getWorkbenchToolPolicy(toolId: string): WorkbenchToolPolicy | undefined {
  const byId = policies.get(toolId) || [];
  return byId[0];
}

export function resolveWorkbenchToolPolicy(
  toolId: string,
  context: { tenantId?: string; workspaceId?: string; sessionId?: string },
): WorkbenchToolPolicy | undefined {
  const byId = policies.get(toolId) || [];
  const candidates = byId.filter((policy) => {
    const scope = policy.scope || { level: 'global' as const };
    if (scope.level === 'global') return true;
    if (scope.level === 'tenant') return !scope.tenantId || scope.tenantId === context.tenantId;
    if (scope.level === 'workspace') {
      const tenantOk = !scope.tenantId || scope.tenantId === context.tenantId;
      const workspaceOk = !scope.workspaceId || scope.workspaceId === context.workspaceId;
      return tenantOk && workspaceOk;
    }
    const tenantOk = !scope.tenantId || scope.tenantId === context.tenantId;
    const workspaceOk = !scope.workspaceId || scope.workspaceId === context.workspaceId;
    const sessionOk = !scope.sessionId || scope.sessionId === context.sessionId;
    return tenantOk && workspaceOk && sessionOk;
  });
  if (candidates.length === 0) return undefined;
  const precedence = (level: WorkbenchScopeLevel): number => {
    if (level === 'session') return 4;
    if (level === 'workspace') return 3;
    if (level === 'tenant') return 2;
    return 1;
  };
  return candidates.sort((a, b) => precedence((b.scope?.level || 'global')) - precedence((a.scope?.level || 'global')))[0];
}

export function isAgentAllowedForTool(toolId: string, agentId: string): boolean {
  const policy = getWorkbenchToolPolicy(toolId);
  if (!policy) return false;
  return policy.allowedAgents.includes('*') || policy.allowedAgents.includes(agentId);
}

export function listWorkbenchToolPolicies(): WorkbenchToolPolicy[] {
  return Array.from(policies.values()).flat();
}

resetWorkbenchToolRegistry();
