export type RuntimeAbacRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface AbacPolicyDefinition {
    id: string;
    actions: string[];
    allowedRoles: RuntimeAbacRole[];
    constraints: {
        tenantScope?: 'auth_only' | 'any';
        workspaceScope?: 'auth_only' | 'any';
    };
}
export interface AbacEvaluationInput {
    action: string;
    role: RuntimeAbacRole;
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
export declare const DEFAULT_ABAC_POLICIES: AbacPolicyDefinition[];
export declare function evaluateAbacPolicyAccess(input: AbacEvaluationInput, policies?: AbacPolicyDefinition[]): AbacEvaluationResult;
