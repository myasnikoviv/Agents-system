"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeMvpProvider = void 0;
class StripeMvpProvider {
    subscriptions = new Map();
    seq = 0;
    createSubscription(input) {
        this.seq += 1;
        const subscription = {
            subscriptionId: `sub_${this.seq}`,
            tenantId: input.tenantId,
            planId: input.planId,
            status: 'active',
        };
        this.subscriptions.set(subscription.subscriptionId, subscription);
        return subscription;
    }
    cancelSubscription(input) {
        const subscription = this.subscriptions.get(input.subscriptionId);
        if (!subscription)
            return null;
        subscription.status = 'canceled';
        return { ...subscription };
    }
    updatePlan(input) {
        const subscription = this.subscriptions.get(input.subscriptionId);
        if (!subscription)
            return null;
        subscription.planId = input.planId;
        return { ...subscription };
    }
    setStatus(input) {
        const subscription = this.subscriptions.get(input.subscriptionId);
        if (!subscription)
            return null;
        subscription.status = input.status;
        return { ...subscription };
    }
    getSubscription(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        return subscription ? { ...subscription } : null;
    }
    listSubscriptions() {
        return Array.from(this.subscriptions.values()).map((s) => ({ ...s }));
    }
}
exports.StripeMvpProvider = StripeMvpProvider;
