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
    createSubscription(input: {
        tenantId: string;
        planId: string;
    }): PaymentSubscription;
    cancelSubscription(input: {
        subscriptionId: string;
    }): PaymentSubscription | null;
    updatePlan(input: {
        subscriptionId: string;
        planId: string;
    }): PaymentSubscription | null;
    setStatus(input: {
        subscriptionId: string;
        status: PaymentSubscription['status'];
    }): PaymentSubscription | null;
    getSubscription(subscriptionId: string): PaymentSubscription | null;
    listSubscriptions(): PaymentSubscription[];
}
export declare class StripeMvpProvider implements PaymentProvider {
    private readonly subscriptions;
    private seq;
    createSubscription(input: {
        tenantId: string;
        planId: string;
    }): PaymentSubscription;
    cancelSubscription(input: {
        subscriptionId: string;
    }): PaymentSubscription | null;
    updatePlan(input: {
        subscriptionId: string;
        planId: string;
    }): PaymentSubscription | null;
    setStatus(input: {
        subscriptionId: string;
        status: PaymentSubscription['status'];
    }): PaymentSubscription | null;
    getSubscription(subscriptionId: string): PaymentSubscription | null;
    listSubscriptions(): PaymentSubscription[];
}
