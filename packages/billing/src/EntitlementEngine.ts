import type { BillingEntitlements } from './BillingDomainModel';

export interface EntitlementCheckInput {
  entitlement: BillingEntitlements;
  requestedModel?: string;
  requestedAgents?: number;
  requiredFeatures?: string[];
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason: string;
}

export class EntitlementEngine {
  check(input: EntitlementCheckInput): EntitlementCheckResult {
    const requestedModel = String(input.requestedModel || '').trim();
    const requestedAgents = Math.max(0, Number(input.requestedAgents || 0));
    const requiredFeatures = Array.isArray(input.requiredFeatures) ? input.requiredFeatures : [];

    if (requestedModel && !input.entitlement.allowedModels.includes(requestedModel)) {
      return { allowed: false, reason: `model_not_allowed:${requestedModel}` };
    }
    if (requestedAgents > 0 && requestedAgents > input.entitlement.maxAgents) {
      return { allowed: false, reason: `agents_limit_exceeded:${requestedAgents}/${input.entitlement.maxAgents}` };
    }
    for (const feature of requiredFeatures) {
      if (!input.entitlement.features.includes(feature)) {
        return { allowed: false, reason: `feature_not_allowed:${feature}` };
      }
    }
    return { allowed: true, reason: 'entitlement_ok' };
  }
}

