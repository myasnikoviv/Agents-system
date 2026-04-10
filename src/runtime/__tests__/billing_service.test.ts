import { BillingService } from '../billing/BillingService';
import { buildDefaultPlanBundle } from '../billing/PlanDefinitions';

describe('BillingService', () => {
  it('stores a valid billing domain snapshot', () => {
    const service = new BillingService();
    const snapshot = {
      plans: [
        {
          planId: 'plan_team_v1',
          name: 'team' as const,
          priceMonthlyUsdCents: 9900,
          quotaIds: ['q_team_tokens'],
          entitlementId: 'ent_team',
          version: 1,
          active: true,
        },
      ],
      subscriptions: [
        {
          subscriptionId: 'sub_team_1',
          tenantId: 'tenant_team',
          planId: 'plan_team_v1',
          status: 'active' as const,
          billingPeriod: 'month' as const,
        },
      ],
      usageRecords: [],
      quotas: [
        {
          quotaId: 'q_team_tokens',
          tenantId: 'tenant_team',
          type: 'tokens' as const,
          period: 'month' as const,
          limit: 2_000_000,
        },
      ],
      entitlements: [
        {
          entitlementId: 'ent_team',
          tenantId: 'tenant_team',
          allowedModels: ['google/gemini-2.5-flash'],
          maxAgents: 16,
          features: ['team_billing', 'admin_billing_panel'],
        },
      ],
    };

    expect(service.replaceSnapshot(snapshot).ok).toBe(true);
    expect(service.getSnapshot().plans).toHaveLength(1);
  });

  it('rejects invalid snapshot payloads', () => {
    const service = new BillingService();
    const invalid = {
      plans: [
        {
          planId: 'plan_broken',
          name: 'pro' as const,
          priceMonthlyUsdCents: 1000,
          quotaIds: ['q_missing'],
          entitlementId: 'ent_missing',
          version: 1,
          active: true,
        },
      ],
      subscriptions: [],
      usageRecords: [],
      quotas: [],
      entitlements: [],
    };

    const result = service.replaceSnapshot(invalid);
    expect(result.ok).toBe(false);
  });

  it('supports plan CRUD with validation', () => {
    const service = new BillingService();
    const base = buildDefaultPlanBundle(1);
    expect(
      service.replaceSnapshot({
        plans: base.plans,
        subscriptions: [],
        usageRecords: [],
        quotas: base.quotas,
        entitlements: base.entitlements,
      }).ok,
    ).toBe(true);

    const create = service.createPlan({
      planId: 'plan_custom_v1',
      name: 'pro',
      priceMonthlyUsdCents: 4900,
      quotaIds: [base.quotas[0].quotaId],
      entitlementId: base.entitlements[0].entitlementId,
      version: 1,
      active: true,
    });
    expect(create.ok).toBe(true);

    const update = service.updatePlan('plan_custom_v1', { priceMonthlyUsdCents: 5900 });
    expect(update.ok).toBe(true);

    const remove = service.deletePlan('plan_custom_v1');
    expect(remove.ok).toBe(true);
  });
});
