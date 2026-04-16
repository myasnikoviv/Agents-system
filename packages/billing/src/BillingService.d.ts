import { type BillingDomainSnapshot, type BillingPlan } from './BillingDomainModel';
export declare class BillingService {
    private snapshot;
    getSnapshot(): BillingDomainSnapshot;
    replaceSnapshot(nextSnapshot: BillingDomainSnapshot): {
        ok: true;
    } | {
        ok: false;
        reason: string;
    };
    validateSnapshot(candidate: BillingDomainSnapshot): {
        ok: true;
    } | {
        ok: false;
        reason: string;
    };
    listPlans(): BillingPlan[];
    createPlan(plan: BillingPlan): {
        ok: true;
        plan: BillingPlan;
    } | {
        ok: false;
        reason: string;
    };
    updatePlan(planId: string, patch: Partial<BillingPlan>): {
        ok: true;
        plan: BillingPlan;
    } | {
        ok: false;
        reason: string;
    };
    deletePlan(planId: string): {
        ok: true;
    } | {
        ok: false;
        reason: string;
    };
}
