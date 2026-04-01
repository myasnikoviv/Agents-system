export type WorkbenchAccessMode = 'parallel' | 'exclusive' | 'isolated';

export interface WorkbenchToolPolicy {
  id: string;
  type: WorkbenchAccessMode;
  allowedAgents: string[];
}

const DEFAULT_WORKBENCH_POLICIES: WorkbenchToolPolicy[] = [
  { id: 'ls', type: 'parallel', allowedAgents: ['*'] },
  { id: 'list_dir', type: 'parallel', allowedAgents: ['*'] },
  { id: 'read_file', type: 'parallel', allowedAgents: ['*'] },
  { id: 'search_web', type: 'parallel', allowedAgents: ['*'] },
  { id: 'filesystem', type: 'exclusive', allowedAgents: ['*'] },
  { id: 'plane', type: 'parallel', allowedAgents: ['*'] },
  { id: 'figma', type: 'exclusive', allowedAgents: ['*'] },
  { id: 'playwright', type: 'isolated', allowedAgents: ['*'] },
];

const policies = new Map<string, WorkbenchToolPolicy>();

export function resetWorkbenchToolRegistry(): void {
  policies.clear();
  for (const policy of DEFAULT_WORKBENCH_POLICIES) {
    policies.set(policy.id, policy);
  }
}

export function upsertWorkbenchToolPolicy(policy: WorkbenchToolPolicy): void {
  policies.set(policy.id, policy);
}

export function getWorkbenchToolPolicy(toolId: string): WorkbenchToolPolicy | undefined {
  return policies.get(toolId);
}

export function isAgentAllowedForTool(toolId: string, agentId: string): boolean {
  const policy = getWorkbenchToolPolicy(toolId);
  if (!policy) return false;
  return policy.allowedAgents.includes('*') || policy.allowedAgents.includes(agentId);
}

export function listWorkbenchToolPolicies(): WorkbenchToolPolicy[] {
  return Array.from(policies.values());
}

resetWorkbenchToolRegistry();
