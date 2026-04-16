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
export declare function runBillingConsistencyChecks(records: MeteredUsageEvent[]): BillingConsistencyReport;
