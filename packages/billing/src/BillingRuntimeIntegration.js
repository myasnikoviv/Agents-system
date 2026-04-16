"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceBillingRuntimePolicy = enforceBillingRuntimePolicy;
const EntitlementEngine_1 = require("./EntitlementEngine");
const entitlementEngine = new EntitlementEngine_1.EntitlementEngine();
function enforceBillingRuntimePolicy(input) {
    const plan = input.billing.plan;
    const entitlement = input.billing.entitlement;
    let adjustedModelRoute = { ...input.modelRoute };
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
