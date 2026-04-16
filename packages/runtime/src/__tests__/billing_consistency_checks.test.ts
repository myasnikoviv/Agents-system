import { runBillingConsistencyChecks } from '@system/billing';

describe('BillingConsistencyChecks', () => {
  it('passes for valid unique non-negative usage records', () => {
    const report = runBillingConsistencyChecks([
      {
        eventId: 'e1',
        runId: 'r1',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.token_usage',
        tenantId: 't1',
        workspaceId: 'w1',
        userId: 'u1',
        quantity: 10,
        timestamp: 1,
      },
      {
        eventId: 'e2',
        runId: 'r1',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.tool_execution',
        tenantId: 't1',
        workspaceId: 'w1',
        userId: 'u1',
        quantity: 2,
        timestamp: 2,
      },
    ] as any);
    expect(report.ok).toBe(true);
  });

  it('fails on duplicates', () => {
    const report = runBillingConsistencyChecks([
      {
        eventId: 'e1',
        runId: 'r1',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.token_usage',
        tenantId: 't1',
        workspaceId: 'w1',
        userId: 'u1',
        quantity: 10,
        timestamp: 1,
      },
      {
        eventId: 'e1',
        runId: 'r1',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.token_usage',
        tenantId: 't1',
        workspaceId: 'w1',
        userId: 'u1',
        quantity: 1,
        timestamp: 2,
      },
    ] as any);
    expect(report.ok).toBe(false);
    expect(report.checks.noDuplication).toBe(false);
  });
});

