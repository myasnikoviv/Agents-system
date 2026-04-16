export type WorkbenchToolMode = 'isolated' | 'share-safe' | 'exclusive';
export interface WorkbenchTool {
    id: string;
    mode: WorkbenchToolMode;
    description: string;
}
export interface ToolLease {
    leaseId: string;
    toolId: string;
    scopeKey: string;
    owner: string;
    acquiredAt: string;
}
type QueueItem = {
    owner: string;
    requestedAt: string;
};
export declare function listWorkbenchState(): {
    tools: {
        holders: ToolLease[];
        queue: QueueItem[];
        id: string;
        mode: WorkbenchToolMode;
        description: string;
    }[];
};
export declare function acquireToolLease(toolId: string, owner: string, scopeKey?: string): {
    status: 'acquired' | 'queued' | 'already_acquired' | 'not_found';
    lease?: ToolLease;
    queuePosition?: number;
    reason?: string;
};
export declare function releaseToolLease(toolId: string, owner: string, scopeKey?: string): {
    released: boolean;
    nextOwner?: string;
    queueLength?: number;
};
export declare function cancelToolQueueRequest(toolId: string, owner: string): {
    cancelled: boolean;
    queueLength: number;
};
export declare function upsertWorkbenchTool(tool: WorkbenchTool): void;
export declare function resetWorkbenchState(): void;
export {};
