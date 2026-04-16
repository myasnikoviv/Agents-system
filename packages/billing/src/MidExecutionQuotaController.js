"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateMidExecutionQuota = evaluateMidExecutionQuota;
const QuotaEngine_1 = require("./QuotaEngine");
const engine = new QuotaEngine_1.QuotaEngine();
function evaluateMidExecutionQuota(input) {
    const consumedUsage = Math.max(0, Number(input.state.consumedUsage || 0));
    const incrementUsage = Math.max(0, Number(input.incrementUsage || 0));
    const projectedUsage = consumedUsage + incrementUsage;
    if (!input.quota) {
        return {
            continueExecution: true,
            reason: 'no_quota_context',
            consumedUsage: projectedUsage,
            projectedUsage,
        };
    }
    const result = engine.evaluate({
        quota: input.quota,
        currentUsage: consumedUsage,
        requestedUsage: incrementUsage,
        burstAllowance: Number(input.burstAllowance || 0),
    });
    return {
        continueExecution: result.decision !== 'block',
        reason: result.reason,
        consumedUsage: projectedUsage,
        projectedUsage,
    };
}
