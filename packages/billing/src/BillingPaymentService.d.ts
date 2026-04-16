import { PaymentWebhookEvent, PaymentProvider, type PaymentSubscription } from './PaymentProvider';
export declare class BillingPaymentService {
    private readonly provider;
    private readonly processedWebhookEventIds;
    constructor(provider: PaymentProvider);
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
    listSubscriptions(): PaymentSubscription[];
    processWebhook(event: PaymentWebhookEvent): {
        accepted: boolean;
        reason: string;
        subscription?: PaymentSubscription | null;
    };
}
