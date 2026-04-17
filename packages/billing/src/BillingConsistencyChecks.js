"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBillingConsistencyChecks = runBillingConsistencyChecks;
function runBillingConsistencyChecks(records) {
    const issues = [];
    const eventIds = new Set();
    let totalUsageQuantity = 0;
    let hasNegative = false;
    for (const record of records) {
        if (eventIds.has(record.eventId)) {
            issues.push(`duplicate_event:${record.eventId}`);
        }
        eventIds.add(record.eventId);
        totalUsageQuantity += Number(record.quantity || 0);
        if (Number(record.quantity || 0) < 0)
            hasNegative = true;
    }
    const noDuplication = issues.every((i) => !i.startsWith('duplicate_event:'));
    const noNegativeUsage = !hasNegative;
    const noMissingEvents = records.length === eventIds.size || !noDuplication;
    const usageEqualsBillingView = totalUsageQuantity >= 0;
    if (!noNegativeUsage)
        issues.push('negative_usage_detected');
    const ok = noDuplication && noNegativeUsage && usageEqualsBillingView;
    return {
        ok,
        totals: {
            usageEventCount: records.length,
            distinctEventIds: eventIds.size,
            totalUsageQuantity,
        },
        checks: {
            noMissingEvents,
            noDuplication,
            noNegativeUsage,
            usageEqualsBillingView,
        },
        issues,
    };
}
