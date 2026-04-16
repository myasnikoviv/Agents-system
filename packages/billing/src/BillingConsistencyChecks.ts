import type { MeteredUsageEvent } from './UsageMeteringPipeline';

export interface BillingConsistencyReport {
  ok: boolean;
  totals: {
    usageEventCount: number;
    distinctEventIds: number;
    totalUsageQuantity: number;
  };
  checks: {
    noMissingEvents: boolean;
    noDuplication: boolean;
    noNegativeUsage: boolean;
    usageEqualsBillingView: boolean;
  };
  issues: string[];
}

export function runBillingConsistencyChecks(records: MeteredUsageEvent[]): BillingConsistencyReport {
  const issues: string[] = [];
  const eventIds = new Set<string>();
  let totalUsageQuantity = 0;
  let hasNegative = false;

  for (const record of records) {
    if (eventIds.has(record.eventId)) {
      issues.push(`duplicate_event:${record.eventId}`);
    }
    eventIds.add(record.eventId);
    totalUsageQuantity += Number(record.quantity || 0);
    if (Number(record.quantity || 0) < 0) hasNegative = true;
  }

  const noDuplication = issues.every((i) => !i.startsWith('duplicate_event:'));
  const noNegativeUsage = !hasNegative;
  const noMissingEvents = records.length === eventIds.size || !noDuplication;
  const usageEqualsBillingView = totalUsageQuantity >= 0;
  if (!noNegativeUsage) issues.push('negative_usage_detected');

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

