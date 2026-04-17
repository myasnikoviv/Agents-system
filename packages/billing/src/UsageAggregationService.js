"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageAggregationService = void 0;
class UsageAggregationService {
    aggregate(records, filter) {
        const selected = records.filter((record) => {
            if (filter.tenantId && record.tenantId !== filter.tenantId)
                return false;
            if (filter.workspaceId && record.workspaceId !== filter.workspaceId)
                return false;
            if (filter.userId && record.userId !== filter.userId)
                return false;
            if (typeof filter.periodStartMs === 'number' && record.timestamp < filter.periodStartMs)
                return false;
            if (typeof filter.periodEndMs === 'number' && record.timestamp > filter.periodEndMs)
                return false;
            return true;
        });
        const byType = {};
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
exports.UsageAggregationService = UsageAggregationService;
