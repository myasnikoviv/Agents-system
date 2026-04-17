export interface RuntimeAgentIdentity {
    projectId: string;
    agentSlug: string;
    workerId: string;
    identityKey: string;
    memoryNamespace: string;
}
export declare function buildAgentIdentity(input: {
    projectId: string;
    agentSlug: string;
    workerId?: string;
    tenantId?: string;
    workspaceId?: string;
    environmentId?: string;
}): RuntimeAgentIdentity;
export declare function assertWorkerProjectIsolation(identity: RuntimeAgentIdentity): {
    ok: boolean;
    reason?: string;
};
export declare function clearIdentityRegistry(): void;
