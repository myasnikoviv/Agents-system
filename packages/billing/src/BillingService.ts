import {
  type BillingDomainSnapshot,
  type BillingPlan,
  validateBillingDomainSnapshot,
} from './BillingDomainModel';

const EMPTY_BILLING_SNAPSHOT: BillingDomainSnapshot = {
  plans: [],
  subscriptions: [],
  usageRecords: [],
  quotas: [],
  entitlements: [],
};

export class BillingService {
  private snapshot: BillingDomainSnapshot = { ...EMPTY_BILLING_SNAPSHOT };

  getSnapshot(): BillingDomainSnapshot {
    return {
      plans: [...this.snapshot.plans],
      subscriptions: [...this.snapshot.subscriptions],
      usageRecords: [...this.snapshot.usageRecords],
      quotas: [...this.snapshot.quotas],
      entitlements: [...this.snapshot.entitlements],
    };
  }

  replaceSnapshot(nextSnapshot: BillingDomainSnapshot): { ok: true } | { ok: false; reason: string } {
    const validation = validateBillingDomainSnapshot(nextSnapshot);
    if (validation.ok === false) return validation;
    this.snapshot = {
      plans: [...nextSnapshot.plans],
      subscriptions: [...nextSnapshot.subscriptions],
      usageRecords: [...nextSnapshot.usageRecords],
      quotas: [...nextSnapshot.quotas],
      entitlements: [...nextSnapshot.entitlements],
    };
    return { ok: true };
  }

  validateSnapshot(candidate: BillingDomainSnapshot): { ok: true } | { ok: false; reason: string } {
    return validateBillingDomainSnapshot(candidate);
  }

  listPlans(): BillingPlan[] {
    return [...this.snapshot.plans];
  }

  createPlan(plan: BillingPlan): { ok: true; plan: BillingPlan } | { ok: false; reason: string } {
    if (this.snapshot.plans.some((p) => p.planId === plan.planId)) {
      return { ok: false, reason: `plan_already_exists:${plan.planId}` };
    }
    const next: BillingDomainSnapshot = {
      ...this.snapshot,
      plans: [...this.snapshot.plans, plan],
    };
    const validation = validateBillingDomainSnapshot(next);
    if (validation.ok === false) return validation;
    this.snapshot = next;
    return { ok: true, plan };
  }

  updatePlan(planId: string, patch: Partial<BillingPlan>): { ok: true; plan: BillingPlan } | { ok: false; reason: string } {
    const index = this.snapshot.plans.findIndex((p) => p.planId === planId);
    if (index < 0) return { ok: false, reason: `plan_not_found:${planId}` };
    const current = this.snapshot.plans[index];
    const updated: BillingPlan = { ...current, ...patch, planId: current.planId };
    const nextPlans = [...this.snapshot.plans];
    nextPlans[index] = updated;
    const next: BillingDomainSnapshot = { ...this.snapshot, plans: nextPlans };
    const validation = validateBillingDomainSnapshot(next);
    if (validation.ok === false) return validation;
    this.snapshot = next;
    return { ok: true, plan: updated };
  }

  deletePlan(planId: string): { ok: true } | { ok: false; reason: string } {
    if (this.snapshot.subscriptions.some((s) => s.planId === planId)) {
      return { ok: false, reason: `plan_in_use:${planId}` };
    }
    const next: BillingDomainSnapshot = {
      ...this.snapshot,
      plans: this.snapshot.plans.filter((p) => p.planId !== planId),
    };
    const validation = validateBillingDomainSnapshot(next);
    if (validation.ok === false) return validation;
    this.snapshot = next;
    return { ok: true };
  }
}
