import type { BillingEntitlements, BillingPlan, BillingQuota } from './BillingDomainModel';
export interface BillingPlanBundle {
    plans: BillingPlan[];
    quotas: BillingQuota[];
    entitlements: BillingEntitlements[];
}
export declare function buildDefaultPlanBundle(version?: number): BillingPlanBundle;
export declare function validateRequiredPlanSet(plans: BillingPlan[]): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
