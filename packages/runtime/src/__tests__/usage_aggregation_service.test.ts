import { UsageAggregationService } from '@system/billing';

describe('UsageAggregationService', () => {
  it('aggregates usage by tenant/workspace/user and period', () => {
    const service = new UsageAggregationService();
    const records = [
      {
        eventId: 'e1',
        runId: 'r1',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.token_usage' as const,
        tenantId: 't1',
        workspaceId: 'w1',
        userId: 'u1',
        quantity: 100,
        timestamp: 1000,
      },
      {
        eventId: 'e2',
        runId: 'r1',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.tool_execution' as const,
        tenantId: 't1',
        workspaceId: 'w1',
        userId: 'u1',
        quantity: 2,
        timestamp: 2000,
      },
      {
        eventId: 'e3',
        runId: 'r2',
        projectId: 'p1',
        chainId: 'c1',
        type: 'usage.token_usage' as const,
        tenantId: 't2',
        workspaceId: 'w2',
        userId: 'u2',
        quantity: 999,
        timestamp: 3000,
      },
    ];

    const result = service.aggregate(records as any, {
      tenantId: 't1',
      workspaceId: 'w1',
      userId: 'u1',
      periodStartMs: 500,
      periodEndMs: 2500,
    });

    expect(result.eventsCount).toBe(2);
    expect(result.totalQuantity).toBe(102);
    expect(result.byType['usage.token_usage']).toBe(100);
    expect(result.byType['usage.tool_execution']).toBe(2);
  });
});

