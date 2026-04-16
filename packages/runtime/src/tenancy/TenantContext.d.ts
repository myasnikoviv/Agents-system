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
export declare function resolveTenantScope(input: TenantScopeInput): TenantScope;
export declare function tenantNamespace(scope: TenantScope, domain: 'memory' | 'queue' | 'artifacts' | 'governance'): string;
export declare function validateTenantBoundary(scope: TenantScope): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
