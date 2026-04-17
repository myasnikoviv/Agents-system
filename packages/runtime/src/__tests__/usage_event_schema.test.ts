import { validateBillingUsagePayload } from '@system/billing';

describe('UsageEventSchema', () => {
  it('accepts payload with tenant/workspace/user and non-negative quantity', () => {
    const result = validateBillingUsagePayload({
      tenantId: 'tenant_1',
      workspaceId: 'workspace_1',
      userId: 'user_1',
      quantity: 42,
      unit: 'tokens',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects payload without tenant/workspace/user', () => {
    const result = validateBillingUsagePayload({
      tenantId: '',
      workspaceId: 'workspace_1',
      userId: 'user_1',
      quantity: 42,
    });
    expect(result.ok).toBe(false);
  });
});

