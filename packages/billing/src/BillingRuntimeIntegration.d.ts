import type { BillingEntitlements, BillingPlan } from './BillingDomainModel';
import type { PlannerDecision, ModelRouteDecision } from '@system/shared';
export interface BillingRuntimeInput {
    plan?: BillingPlan;
    entitlement?: BillingEntitlements;
    requiredFeatures?: string[];
}
export interface BillingRuntimeDecision {
    allowed: boolean;
    reason: string;
    adjustedModelRoute?: ModelRouteDecision;
}
export declare function enforceBillingRuntimePolicy(input: {
    billing: BillingRuntimeInput;
    plannerDecision: PlannerDecision;
    modelRoute: ModelRouteDecision;
}): BillingRuntimeDecision;
