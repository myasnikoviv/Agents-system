import type { MeteredUsageEvent } from './UsageMeteringPipeline';
export interface UsageAggregationFilter {
    tenantId?: string;
    workspaceId?: string;
    userId?: string;
    periodStartMs?: number;
    periodEndMs?: number;
}
export interface UsageAggregationResult {
    totalQuantity: number;
    eventsCount: number;
    byType: Record<string, number>;
}
export declare class UsageAggregationService {
    aggregate(records: MeteredUsageEvent[], filter: UsageAggregationFilter): UsageAggregationResult;
}
