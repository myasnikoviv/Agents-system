import { enforceBillingRuntimePolicy } from '../billing/BillingRuntimeIntegration';

describe('BillingRuntimeIntegration', () => {
  it('blocks execution when model is not allowed by entitlement', () => {
    const result = enforceBillingRuntimePolicy({
      billing: {
        plan: {
          planId: 'plan_enterprise_v1',
          name: 'enterprise',
          priceMonthlyUsdCents: 49900,
          quotaIds: [],
          entitlementId: 'ent_1',
          version: 1,
          active: true,
        },
        entitlement: {
          entitlementId: 'ent_1',
          tenantId: 't1',
          allowedModels: ['google/gemini-2.5-flash'],
          maxAgents: 5,
          features: ['billing_overview'],
        },
      },
      plannerDecision: {
        pipeline: 'new-feature',
        agents: ['developer'],
        skills: [],
        stages: ['a'],
        confidence: 'high',
        source: 'deterministic-planner',
        reason: 'test',
      },
      modelRoute: {
        runId: 'r1',
        projectId: 'p1',
        taskType: 'general',
        modelTier: 'expensive',
        model: 'openai/gpt-5.4',
        reason: 'test',
      },
    });
    expect(result.allowed).toBe(false);
  });

  it('downgrades expensive tier for free/pro plans', () => {
    const result = enforceBillingRuntimePolicy({
      billing: {
        plan: {
          planId: 'plan_free_v1',
          name: 'free',
          priceMonthlyUsdCents: 0,
          quotaIds: [],
          entitlementId: 'ent_1',
          version: 1,
          active: true,
        },
        entitlement: {
          entitlementId: 'ent_1',
          tenantId: 't1',
          allowedModels: ['openai/gpt-5.4'],
          maxAgents: 5,
          features: [],
        },
      },
      plannerDecision: {
        pipeline: 'new-feature',
        agents: ['developer'],
        skills: [],
        stages: ['a'],
        confidence: 'high',
        source: 'deterministic-planner',
        reason: 'test',
      },
      modelRoute: {
        runId: 'r1',
        projectId: 'p1',
        taskType: 'general',
        modelTier: 'expensive',
        model: 'openai/gpt-5.4',
        reason: 'test',
      },
    });
    expect(result.allowed).toBe(true);
    expect(result.adjustedModelRoute?.modelTier).toBe('cheap');
  });
});

