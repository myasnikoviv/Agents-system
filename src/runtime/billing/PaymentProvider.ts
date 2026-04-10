export type PaymentEventType = 'subscription.updated' | 'payment.failed' | 'payment.succeeded';

export interface PaymentSubscription {
  subscriptionId: string;
  tenantId: string;
  planId: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
}

export interface PaymentWebhookEvent {
  eventId: string;
  type: PaymentEventType;
  subscriptionId: string;
  tenantId: string;
  planId?: string;
  status?: PaymentSubscription['status'];
  timestampMs: number;
}

export interface PaymentProvider {
  createSubscription(input: { tenantId: string; planId: string }): PaymentSubscription;
  cancelSubscription(input: { subscriptionId: string }): PaymentSubscription | null;
  updatePlan(input: { subscriptionId: string; planId: string }): PaymentSubscription | null;
  setStatus(input: { subscriptionId: string; status: PaymentSubscription['status'] }): PaymentSubscription | null;
  getSubscription(subscriptionId: string): PaymentSubscription | null;
  listSubscriptions(): PaymentSubscription[];
}

export class StripeMvpProvider implements PaymentProvider {
  private readonly subscriptions = new Map<string, PaymentSubscription>();
  private seq = 0;

  createSubscription(input: { tenantId: string; planId: string }): PaymentSubscription {
    this.seq += 1;
    const subscription: PaymentSubscription = {
      subscriptionId: `sub_${this.seq}`,
      tenantId: input.tenantId,
      planId: input.planId,
      status: 'active',
    };
    this.subscriptions.set(subscription.subscriptionId, subscription);
    return subscription;
  }

  cancelSubscription(input: { subscriptionId: string }): PaymentSubscription | null {
    const subscription = this.subscriptions.get(input.subscriptionId);
    if (!subscription) return null;
    subscription.status = 'canceled';
    return { ...subscription };
  }

  updatePlan(input: { subscriptionId: string; planId: string }): PaymentSubscription | null {
    const subscription = this.subscriptions.get(input.subscriptionId);
    if (!subscription) return null;
    subscription.planId = input.planId;
    return { ...subscription };
  }

  setStatus(input: { subscriptionId: string; status: PaymentSubscription['status'] }): PaymentSubscription | null {
    const subscription = this.subscriptions.get(input.subscriptionId);
    if (!subscription) return null;
    subscription.status = input.status;
    return { ...subscription };
  }

  getSubscription(subscriptionId: string): PaymentSubscription | null {
    const subscription = this.subscriptions.get(subscriptionId);
    return subscription ? { ...subscription } : null;
  }

  listSubscriptions(): PaymentSubscription[] {
    return Array.from(this.subscriptions.values()).map((s) => ({ ...s }));
  }
}
