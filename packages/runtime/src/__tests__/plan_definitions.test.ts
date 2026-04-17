import { buildDefaultPlanBundle, validateRequiredPlanSet } from '@system/billing';

describe('PlanDefinitions', () => {
  it('provides Free/Pro/Team/Enterprise plan set', () => {
    const bundle = buildDefaultPlanBundle(2);
    const validation = validateRequiredPlanSet(bundle.plans);
    expect(validation.ok).toBe(true);
    expect(bundle.plans.every((p) => p.version === 2)).toBe(true);
  });

  it('fails when required plan is missing', () => {
    const bundle = buildDefaultPlanBundle(1);
    const filtered = bundle.plans.filter((p) => p.name !== 'team');
    const validation = validateRequiredPlanSet(filtered);
    expect(validation.ok).toBe(false);
  });
});

