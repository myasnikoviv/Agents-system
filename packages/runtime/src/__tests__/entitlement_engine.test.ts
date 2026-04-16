import { EntitlementEngine } from '@system/billing';

describe('EntitlementEngine', () => {
  const engine = new EntitlementEngine();
  const entitlement = {
    entitlementId: 'ent_pro',
    tenantId: 't1',
    allowedModels: ['google/gemini-2.5-flash', 'openai/gpt-5.4-mini'],
    maxAgents: 6,
    features: ['billing_overview', 'governance_center'],
  };

  it('allows valid request', () => {
    const result = engine.check({
      entitlement,
      requestedModel: 'google/gemini-2.5-flash',
      requestedAgents: 4,
      requiredFeatures: ['billing_overview'],
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks disallowed model', () => {
    const result = engine.check({
      entitlement,
      requestedModel: 'openai/o3',
    });
    expect(result.allowed).toBe(false);
  });
});

