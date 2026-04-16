import type { RuntimeEvent } from '@system/shared';
export interface MeteredUsageEvent {
    eventId: string;
    runId: string;
    projectId: string;
    chainId: string;
    type: RuntimeEvent['type'];
    tenantId: string;
    workspaceId: string;
    userId: string;
    quantity: number;
    unit?: string;
    timestamp: number;
}
export declare class UsageMeteringPipeline {
    private readonly seenEventIds;
    private readonly records;
    process(event: RuntimeEvent): {
        accepted: boolean;
        reason?: string;
    };
    getRecords(): MeteredUsageEvent[];
}
export declare const usageMeteringPipeline: UsageMeteringPipeline;
