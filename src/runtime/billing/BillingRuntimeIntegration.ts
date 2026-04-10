import { EntitlementEngine } from './EntitlementEngine';
import type { BillingEntitlements, BillingPlan } from './BillingDomainModel';
import type { PlannerDecision } from '../planner/PlannerEngine';
import type { ModelRouteDecision } from '../adaptive/AdaptiveIntelligenceEngine';

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

const entitlementEngine = new EntitlementEngine();

export function enforceBillingRuntimePolicy(input: {
  billing: BillingRuntimeInput;
  plannerDecision: PlannerDecision;
  modelRoute: ModelRouteDecision;
}): BillingRuntimeDecision {
  const plan = input.billing.plan;
  const entitlement = input.billing.entitlement;

  let adjustedModelRoute: ModelRouteDecision = { ...input.modelRoute };

  if (plan && (plan.name === 'free' || plan.name === 'pro')) {
    if (adjustedModelRoute.modelTier === 'expensive') {
      adjustedModelRoute = {
        ...adjustedModelRoute,
        modelTier: 'cheap',
        reason: `${adjustedModelRoute.reason};downgraded_by_plan:${plan.name}`,
      };
    }
  }

  if (entitlement) {
    const check = entitlementEngine.check({
      entitlement,
      requestedModel: adjustedModelRoute.model,
      requestedAgents: input.plannerDecision.agents.length,
      requiredFeatures: input.billing.requiredFeatures || [],
    });
    if (!check.allowed) {
      return { allowed: false, reason: check.reason, adjustedModelRoute };
    }
  }

  return { allowed: true, reason: 'billing_runtime_ok', adjustedModelRoute };
}

