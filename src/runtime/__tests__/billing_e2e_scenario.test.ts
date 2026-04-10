import { BillingPaymentService } from '../billing/BillingPaymentService';
import { StripeMvpProvider } from '../billing/PaymentProvider';
import { UsageMeteringPipeline } from '../billing/UsageMeteringPipeline';
import { UsageAggregationService } from '../billing/UsageAggregationService';
import { QuotaEngine } from '../billing/QuotaEngine';
import { runBillingConsistencyChecks } from '../billing/BillingConsistencyChecks';

describe('Billing E2E Scenario', () => {
  it('create tenant -> subscribe -> use system -> usage tracked -> quota enforced -> consistency ok', () => {
    const payment = new BillingPaymentService(new StripeMvpProvider());
    const metering = new UsageMeteringPipeline();
    const aggregation = new UsageAggregationService();
    const quotaEngine = new QuotaEngine();

    const tenantId = 'tenant_e2e';
    const subscription = payment.createSubscription({ tenantId, planId: 'plan_pro_v1' });
    expect(subscription.status).toBe('active');

    const event = {
      id: 'evt_usage_1',
      runId: 'run_1',
      projectId: 'project_1',
      chainId: 'chain_1',
      type: 'usage.token_usage' as const,
      timestamp: Date.now(),
      payload: {
        tenantId,
        workspaceId: 'ws_1',
        userId: 'user_1',
        quantity: 500,
      },
    };
    expect(metering.process(event as any).accepted).toBe(true);

    const usage = aggregation.aggregate(metering.getRecords(), { tenantId });
    expect(usage.totalQuantity).toBe(500);

    const quotaDecision = quotaEngine.evaluate({
      quota: {
        quotaId: 'q1',
        tenantId,
        type: 'tokens',
        period: 'month',
        limit: 1000,
      },
      currentUsage: usage.totalQuantity,
      requestedUsage: 600,
    });
    expect(quotaDecision.decision).toBe('block');

    const report = runBillingConsistencyChecks(metering.getRecords());
    expect(report.ok).toBe(true);
  });
});

