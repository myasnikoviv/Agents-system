import type { WorkbenchToolPolicy } from '../WorkbenchToolRegistry';
export declare function isDeterministicToolCacheable(input: {
    workspacePath: string;
    toolId: string;
    policy?: WorkbenchToolPolicy;
}): boolean;
export declare function buildToolCacheKey(input: {
    toolId: string;
    args: any;
    tenantId?: string;
    workspaceId?: string;
    scopeLevel?: string;
}): string;
export declare function getToolResultFromCache(input: {
    workspacePath: string;
    key: string;
    nowMs?: number;
}): {
    hit: boolean;
    content?: any;
};
export declare function setToolResultToCache(input: {
    workspacePath: string;
    key: string;
    content: any;
    nowMs?: number;
}): void;
