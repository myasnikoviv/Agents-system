import { evaluateAntiAbuse, validateTenantIsolation } from '../billing/AntiAbuseGuard';

describe('AntiAbuseGuard', () => {
  it('allows normal traffic', () => {
    const result = evaluateAntiAbuse({
      tenantId: 'tenant_1',
      actorId: 'user_1',
      actionKey: 'billing:create_subscription',
      nowMs: 1_000,
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks tenant isolation violations', () => {
    const result = validateTenantIsolation({ tenantId: 'tenant_1', resourceTenantId: 'tenant_2' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('tenant_isolation_violation');
  });
});

