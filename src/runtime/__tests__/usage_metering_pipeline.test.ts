import { UsageMeteringPipeline } from '../billing/UsageMeteringPipeline';

describe('UsageMeteringPipeline', () => {
  it('accepts a usage event once and rejects duplicates', () => {
    const pipeline = new UsageMeteringPipeline();
    const event = {
      id: 'evt_1',
      type: 'usage.token_usage' as const,
      runId: 'run_1',
      projectId: 'project_1',
      chainId: 'chain_1',
      timestamp: Date.now(),
      payload: {
        tenantId: 'tenant_1',
        workspaceId: 'workspace_1',
        userId: 'user_1',
        quantity: 100,
      },
    };

    expect(pipeline.process(event).accepted).toBe(true);
    expect(pipeline.process(event).accepted).toBe(false);
    expect(pipeline.getRecords()).toHaveLength(1);
  });

  it('ignores non-usage runtime events', () => {
    const pipeline = new UsageMeteringPipeline();
    const nonUsageEvent = {
      id: 'evt_2',
      type: 'agent.started' as const,
      runId: 'run_1',
      projectId: 'project_1',
      chainId: 'chain_1',
      timestamp: Date.now(),
      payload: {},
    };

    const result = pipeline.process(nonUsageEvent as any);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('not_usage_event');
    expect(pipeline.getRecords()).toHaveLength(0);
  });
});

