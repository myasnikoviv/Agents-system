import { BillingPaymentService } from '@system/billing';
import { StripeMvpProvider } from '@system/billing';

describe('BillingPaymentService', () => {
  it('creates, updates plan, and cancels subscription', () => {
    const service = new BillingPaymentService(new StripeMvpProvider());
    const created = service.createSubscription({ tenantId: 'tenant_1', planId: 'plan_free_v1' });
    expect(created.status).toBe('active');

    const updated = service.updatePlan({ subscriptionId: created.subscriptionId, planId: 'plan_pro_v1' });
    expect(updated?.planId).toBe('plan_pro_v1');

    const cancelled = service.cancelSubscription({ subscriptionId: created.subscriptionId });
    expect(cancelled?.status).toBe('canceled');
  });

  it('processes webhooks with idempotency', () => {
    const service = new BillingPaymentService(new StripeMvpProvider());
    const created = service.createSubscription({ tenantId: 'tenant_1', planId: 'plan_free_v1' });

    const e1 = service.processWebhook({
      eventId: 'evt_1',
      type: 'subscription.updated',
      subscriptionId: created.subscriptionId,
      tenantId: 'tenant_1',
      planId: 'plan_team_v1',
      timestampMs: Date.now(),
    });
    expect(e1.accepted).toBe(true);
    expect(e1.subscription?.planId).toBe('plan_team_v1');

    const duplicate = service.processWebhook({
      eventId: 'evt_1',
      type: 'subscription.updated',
      subscriptionId: created.subscriptionId,
      tenantId: 'tenant_1',
      planId: 'plan_pro_v1',
      timestampMs: Date.now(),
    });
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.reason).toBe('duplicate_event');

    const failed = service.processWebhook({
      eventId: 'evt_2',
      type: 'payment.failed',
      subscriptionId: created.subscriptionId,
      tenantId: 'tenant_1',
      timestampMs: Date.now(),
    });
    expect(failed.accepted).toBe(true);
    expect(failed.reason).toBe('payment_failed');

    const succeeded = service.processWebhook({
      eventId: 'evt_3',
      type: 'payment.succeeded',
      subscriptionId: created.subscriptionId,
      tenantId: 'tenant_1',
      timestampMs: Date.now(),
    });
    expect(succeeded.accepted).toBe(true);
    expect(succeeded.reason).toBe('payment_succeeded');

    const listed = service.listSubscriptions();
    expect(listed).toHaveLength(1);
    expect(listed[0].subscriptionId).toBe(created.subscriptionId);
  });
});
