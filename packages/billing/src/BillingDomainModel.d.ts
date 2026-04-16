export type BillingPeriod = 'day' | 'week' | 'month' | 'year';
export type QuotaType = 'tokens' | 'runtime_time' | 'tool_executions' | 'storage' | 'mcp_calls';
export interface BillingQuota {
    quotaId: string;
    tenantId: string;
    type: QuotaType;
    period: BillingPeriod;
    limit: number;
    softLimit?: number;
}
export interface BillingEntitlements {
    entitlementId: string;
    tenantId: string;
    allowedModels: string[];
    maxAgents: number;
    features: string[];
}
export interface BillingPlan {
    planId: string;
    name: 'free' | 'pro' | 'team' | 'enterprise';
    priceMonthlyUsdCents: number;
    quotaIds: string[];
    entitlementId: string;
    version: number;
    active: boolean;
}
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
export interface BillingSubscription {
    subscriptionId: string;
    tenantId: string;
    planId: string;
    status: SubscriptionStatus;
    billingPeriod: BillingPeriod;
}
export type UsageEventType = 'token_usage' | 'tool_execution' | 'runtime_time' | 'storage_usage' | 'mcp_usage';
export interface BillingUsageRecord {
    usageId: string;
    tenantId: string;
    workspaceId: string;
    userId: string;
    type: UsageEventType;
    quantity: number;
    timestampMs: number;
}
export interface BillingDomainSnapshot {
    plans: BillingPlan[];
    subscriptions: BillingSubscription[];
    usageRecords: BillingUsageRecord[];
    quotas: BillingQuota[];
    entitlements: BillingEntitlements[];
}
export declare function validateBillingDomainSnapshot(snapshot: BillingDomainSnapshot): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
