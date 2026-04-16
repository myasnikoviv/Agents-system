"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const billing_1 = require("@system/billing");
const billing_2 = require("@system/billing");
const billing_3 = require("@system/billing");
const billing_4 = require("@system/billing");
const billing_5 = require("@system/billing");
const billing_6 = require("@system/billing");
describe('Billing E2E Scenario', () => {
    it('create tenant -> subscribe -> use system -> usage tracked -> quota enforced -> consistency ok', () => {
        const payment = new billing_1.BillingPaymentService(new billing_2.StripeMvpProvider());
        const metering = new billing_3.UsageMeteringPipeline();
        const aggregation = new billing_4.UsageAggregationService();
        const quotaEngine = new billing_5.QuotaEngine();
        const tenantId = 'tenant_e2e';
        const subscription = payment.createSubscription({ tenantId, planId: 'plan_pro_v1' });
        expect(subscription.status).toBe('active');
        const event = {
            id: 'evt_usage_1',
            runId: 'run_1',
            projectId: 'project_1',
            chainId: 'chain_1',
            type: 'usage.token_usage',
            timestamp: Date.now(),
            payload: {
                tenantId,
                workspaceId: 'ws_1',
                userId: 'user_1',
                quantity: 500,
            },
        };
        expect(metering.process(event).accepted).toBe(true);
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
        const report = (0, billing_6.runBillingConsistencyChecks)(metering.getRecords());
        expect(report.ok).toBe(true);
    });
});
