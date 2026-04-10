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

export class UsageAggregationService {
  aggregate(records: MeteredUsageEvent[], filter: UsageAggregationFilter): UsageAggregationResult {
    const selected = records.filter((record) => {
      if (filter.tenantId && record.tenantId !== filter.tenantId) return false;
      if (filter.workspaceId && record.workspaceId !== filter.workspaceId) return false;
      if (filter.userId && record.userId !== filter.userId) return false;
      if (typeof filter.periodStartMs === 'number' && record.timestamp < filter.periodStartMs) return false;
      if (typeof filter.periodEndMs === 'number' && record.timestamp > filter.periodEndMs) return false;
      return true;
    });

    const byType: Record<string, number> = {};
    let totalQuantity = 0;
    for (const record of selected) {
      totalQuantity += record.quantity;
      byType[record.type] = (byType[record.type] || 0) + record.quantity;
    }

    return {
      totalQuantity,
      eventsCount: selected.length,
      byType,
    };
  }
}

