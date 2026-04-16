import type { BillingEntitlements, BillingPlan, BillingQuota } from './BillingDomainModel';

export interface BillingPlanBundle {
  plans: BillingPlan[];
  quotas: BillingQuota[];
  entitlements: BillingEntitlements[];
}

export function buildDefaultPlanBundle(version: number = 1): BillingPlanBundle {
  const entitlements: BillingEntitlements[] = [
    {
      entitlementId: `ent_free_v${version}`,
      tenantId: 'default',
      allowedModels: ['google/gemini-2.5-flash'],
      maxAgents: 2,
      features: ['workspace_basic'],
    },
    {
      entitlementId: `ent_pro_v${version}`,
      tenantId: 'default',
      allowedModels: ['google/gemini-2.5-flash', 'openai/gpt-5.4-mini'],
      maxAgents: 6,
      features: ['workspace_basic', 'billing_overview', 'governance_center'],
    },
    {
      entitlementId: `ent_team_v${version}`,
      tenantId: 'default',
      allowedModels: ['google/gemini-2.5-flash', 'openai/gpt-5.4', 'openai/o4-mini'],
      maxAgents: 20,
      features: ['workspace_basic', 'billing_overview', 'governance_center', 'team_management'],
    },
    {
      entitlementId: `ent_enterprise_v${version}`,
      tenantId: 'default',
      allowedModels: ['google/gemini-2.5-flash', 'openai/gpt-5.4', 'openai/o3'],
      maxAgents: 100,
      features: ['workspace_basic', 'billing_overview', 'governance_center', 'team_management', 'enterprise_controls'],
    },
  ];

  const quotas: BillingQuota[] = [
    { quotaId: `q_free_tokens_v${version}`, tenantId: 'default', type: 'tokens', period: 'month', limit: 100_000, softLimit: 90_000 },
    { quotaId: `q_pro_tokens_v${version}`, tenantId: 'default', type: 'tokens', period: 'month', limit: 2_000_000, softLimit: 1_800_000 },
    { quotaId: `q_team_tokens_v${version}`, tenantId: 'default', type: 'tokens', period: 'month', limit: 10_000_000, softLimit: 9_000_000 },
    { quotaId: `q_enterprise_tokens_v${version}`, tenantId: 'default', type: 'tokens', period: 'month', limit: 50_000_000, softLimit: 45_000_000 },
  ];

  const plans: BillingPlan[] = [
    { planId: `plan_free_v${version}`, name: 'free', priceMonthlyUsdCents: 0, quotaIds: [`q_free_tokens_v${version}`], entitlementId: `ent_free_v${version}`, version, active: true },
    { planId: `plan_pro_v${version}`, name: 'pro', priceMonthlyUsdCents: 2900, quotaIds: [`q_pro_tokens_v${version}`], entitlementId: `ent_pro_v${version}`, version, active: true },
    { planId: `plan_team_v${version}`, name: 'team', priceMonthlyUsdCents: 9900, quotaIds: [`q_team_tokens_v${version}`], entitlementId: `ent_team_v${version}`, version, active: true },
    { planId: `plan_enterprise_v${version}`, name: 'enterprise', priceMonthlyUsdCents: 49900, quotaIds: [`q_enterprise_tokens_v${version}`], entitlementId: `ent_enterprise_v${version}`, version, active: true },
  ];

  return { plans, quotas, entitlements };
}

export function validateRequiredPlanSet(plans: BillingPlan[]): { ok: true } | { ok: false; reason: string } {
  const names = new Set(plans.map((p) => p.name));
  for (const required of ['free', 'pro', 'team', 'enterprise'] as const) {
    if (!names.has(required)) return { ok: false, reason: `missing_plan:${required}` };
  }
  return { ok: true };
}

