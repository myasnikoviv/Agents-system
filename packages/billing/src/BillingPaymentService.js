"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingPaymentService = void 0;
class BillingPaymentService {
    provider;
    processedWebhookEventIds = new Set();
    constructor(provider) {
        this.provider = provider;
    }
    createSubscription(input) {
        return this.provider.createSubscription(input);
    }
    cancelSubscription(input) {
        return this.provider.cancelSubscription(input);
    }
    updatePlan(input) {
        return this.provider.updatePlan(input);
    }
    listSubscriptions() {
        return this.provider.listSubscriptions();
    }
    processWebhook(event) {
        if (this.processedWebhookEventIds.has(event.eventId)) {
            return { accepted: false, reason: 'duplicate_event' };
        }
        this.processedWebhookEventIds.add(event.eventId);
        if (event.type === 'subscription.updated' && event.planId) {
            const updated = this.updatePlan({
                subscriptionId: event.subscriptionId,
                planId: event.planId,
            });
            if (event.status && updated) {
                if (event.status === 'canceled') {
                    return { accepted: true, reason: 'subscription_updated_and_canceled', subscription: this.cancelSubscription({ subscriptionId: event.subscriptionId }) };
                }
            }
            return { accepted: true, reason: 'subscription_updated', subscription: updated };
        }
        if (event.type === 'payment.failed') {
            const updated = this.provider.setStatus({ subscriptionId: event.subscriptionId, status: 'past_due' });
            if (!updated)
                return { accepted: true, reason: 'payment_failed_subscription_missing', subscription: null };
            return { accepted: true, reason: 'payment_failed', subscription: updated };
        }
        if (event.type === 'payment.succeeded') {
            const updated = this.provider.setStatus({ subscriptionId: event.subscriptionId, status: 'active' });
            if (!updated)
                return { accepted: true, reason: 'payment_succeeded_subscription_missing', subscription: null };
            return { accepted: true, reason: 'payment_succeeded', subscription: updated };
        }
        return { accepted: false, reason: 'unsupported_event_type' };
    }
}
exports.BillingPaymentService = BillingPaymentService;
