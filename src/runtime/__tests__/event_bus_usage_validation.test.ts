import { validateCanonicalEventInput } from '../events/EventValidation';

describe('EventBus usage event validation', () => {
  it('accepts valid usage event payload', () => {
    expect(() =>
      validateCanonicalEventInput({
        type: 'usage.token_usage',
        runId: 'run_1',
        projectId: 'project_1',
        chainId: 'chain_1',
        payload: {
          tenantId: 'tenant_1',
          workspaceId: 'workspace_1',
          userId: 'user_1',
          quantity: 10,
        },
      }),
    ).not.toThrow();
  });

  it('rejects usage event payload missing tenant', () => {
    expect(() =>
      validateCanonicalEventInput({
        type: 'usage.token_usage',
        runId: 'run_1',
        projectId: 'project_1',
        chainId: 'chain_1',
        payload: {
          workspaceId: 'workspace_1',
          userId: 'user_1',
          quantity: 10,
        },
      } as any),
    ).toThrow(/usage_payload_missing_tenant_id/);
  });
});
