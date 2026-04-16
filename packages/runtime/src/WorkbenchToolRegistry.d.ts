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
export declare function resetWorkbenchToolRegistry(): void;
export declare function upsertWorkbenchToolPolicy(policy: WorkbenchToolPolicy): void;
export declare function getWorkbenchToolPolicy(toolId: string): WorkbenchToolPolicy | undefined;
export declare function resolveWorkbenchToolPolicy(toolId: string, context: {
    tenantId?: string;
    workspaceId?: string;
    sessionId?: string;
}): WorkbenchToolPolicy | undefined;
export declare function isAgentAllowedForTool(toolId: string, agentId: string): boolean;
export declare function listWorkbenchToolPolicies(): WorkbenchToolPolicy[];
