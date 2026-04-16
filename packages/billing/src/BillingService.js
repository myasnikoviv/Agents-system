"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const BillingDomainModel_1 = require("./BillingDomainModel");
const EMPTY_BILLING_SNAPSHOT = {
    plans: [],
    subscriptions: [],
    usageRecords: [],
    quotas: [],
    entitlements: [],
};
class BillingService {
    snapshot = { ...EMPTY_BILLING_SNAPSHOT };
    getSnapshot() {
        return {
            plans: [...this.snapshot.plans],
            subscriptions: [...this.snapshot.subscriptions],
            usageRecords: [...this.snapshot.usageRecords],
            quotas: [...this.snapshot.quotas],
            entitlements: [...this.snapshot.entitlements],
        };
    }
    replaceSnapshot(nextSnapshot) {
        const validation = (0, BillingDomainModel_1.validateBillingDomainSnapshot)(nextSnapshot);
        if (validation.ok === false)
            return validation;
        this.snapshot = {
            plans: [...nextSnapshot.plans],
            subscriptions: [...nextSnapshot.subscriptions],
            usageRecords: [...nextSnapshot.usageRecords],
            quotas: [...nextSnapshot.quotas],
            entitlements: [...nextSnapshot.entitlements],
        };
        return { ok: true };
    }
    validateSnapshot(candidate) {
        return (0, BillingDomainModel_1.validateBillingDomainSnapshot)(candidate);
    }
    listPlans() {
        return [...this.snapshot.plans];
    }
    createPlan(plan) {
        if (this.snapshot.plans.some((p) => p.planId === plan.planId)) {
            return { ok: false, reason: `plan_already_exists:${plan.planId}` };
        }
        const next = {
            ...this.snapshot,
            plans: [...this.snapshot.plans, plan],
        };
        const validation = (0, BillingDomainModel_1.validateBillingDomainSnapshot)(next);
        if (validation.ok === false)
            return validation;
        this.snapshot = next;
        return { ok: true, plan };
    }
    updatePlan(planId, patch) {
        const index = this.snapshot.plans.findIndex((p) => p.planId === planId);
        if (index < 0)
            return { ok: false, reason: `plan_not_found:${planId}` };
        const current = this.snapshot.plans[index];
        const updated = { ...current, ...patch, planId: current.planId };
        const nextPlans = [...this.snapshot.plans];
        nextPlans[index] = updated;
        const next = { ...this.snapshot, plans: nextPlans };
        const validation = (0, BillingDomainModel_1.validateBillingDomainSnapshot)(next);
        if (validation.ok === false)
            return validation;
        this.snapshot = next;
        return { ok: true, plan: updated };
    }
    deletePlan(planId) {
        if (this.snapshot.subscriptions.some((s) => s.planId === planId)) {
            return { ok: false, reason: `plan_in_use:${planId}` };
        }
        const next = {
            ...this.snapshot,
            plans: this.snapshot.plans.filter((p) => p.planId !== planId),
        };
        const validation = (0, BillingDomainModel_1.validateBillingDomainSnapshot)(next);
        if (validation.ok === false)
            return validation;
        this.snapshot = next;
        return { ok: true };
    }
}
exports.BillingService = BillingService;
