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

export function validateBillingDomainSnapshot(snapshot: BillingDomainSnapshot): { ok: true } | { ok: false; reason: string } {
  const planIds = new Set(snapshot.plans.map((plan) => plan.planId));
  const quotaIds = new Set(snapshot.quotas.map((quota) => quota.quotaId));
  const entitlementIds = new Set(snapshot.entitlements.map((entitlement) => entitlement.entitlementId));
  const knownTenantIds = new Set<string>();

  for (const plan of snapshot.plans) {
    if (!entitlementIds.has(plan.entitlementId)) {
      return { ok: false, reason: `plan_without_entitlement:${plan.planId}` };
    }
    for (const quotaId of plan.quotaIds) {
      if (!quotaIds.has(quotaId)) {
        return { ok: false, reason: `plan_unknown_quota:${plan.planId}:${quotaId}` };
      }
    }
  }

  for (const quota of snapshot.quotas) {
    if (quota.limit < 0) {
      return { ok: false, reason: `negative_quota_limit:${quota.quotaId}` };
    }
    if (typeof quota.softLimit === 'number' && quota.softLimit > quota.limit) {
      return { ok: false, reason: `soft_limit_exceeds_hard_limit:${quota.quotaId}` };
    }
    knownTenantIds.add(quota.tenantId);
  }

  for (const entitlement of snapshot.entitlements) {
    if (entitlement.maxAgents < 1) {
      return { ok: false, reason: `invalid_max_agents:${entitlement.entitlementId}` };
    }
    knownTenantIds.add(entitlement.tenantId);
  }

  for (const subscription of snapshot.subscriptions) {
    if (!planIds.has(subscription.planId)) {
      return { ok: false, reason: `subscription_unknown_plan:${subscription.subscriptionId}` };
    }
    knownTenantIds.add(subscription.tenantId);
  }

  for (const usage of snapshot.usageRecords) {
    if (usage.quantity < 0) {
      return { ok: false, reason: `negative_usage:${usage.usageId}` };
    }
    if (!knownTenantIds.has(usage.tenantId)) {
      return { ok: false, reason: `usage_unknown_tenant:${usage.usageId}` };
    }
  }

  return { ok: true };
}
