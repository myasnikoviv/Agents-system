import type { BillingEntitlements } from './BillingDomainModel';
export interface EntitlementCheckInput {
    entitlement: BillingEntitlements;
    requestedModel?: string;
    requestedAgents?: number;
    requiredFeatures?: string[];
}
export interface EntitlementCheckResult {
    allowed: boolean;
    reason: string;
}
export declare class EntitlementEngine {
    check(input: EntitlementCheckInput): EntitlementCheckResult;
}
