"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePreExecutionQuota = evaluatePreExecutionQuota;
const QuotaEngine_1 = require("./QuotaEngine");
const quotaEngine = new QuotaEngine_1.QuotaEngine();
function evaluatePreExecutionQuota(context) {
    if (!context.quota) {
        return { allowed: true };
    }
    const result = quotaEngine.evaluate({
        quota: context.quota,
        currentUsage: Number(context.currentUsage || 0),
        requestedUsage: Number(context.requestedUsage || 0),
        burstAllowance: Number(context.burstAllowance || 0),
    });
    if (result.decision === 'block') {
        return {
            allowed: false,
            decision: result.decision,
            reason: result.reason,
            projectedUsage: result.projectedUsage,
            limit: result.limit,
            message: `Execution blocked by quota policy: ${result.reason}. Projected usage ${result.projectedUsage} exceeds limit ${result.limit}.`,
        };
    }
    return {
        allowed: true,
        decision: result.decision,
        reason: result.reason,
        projectedUsage: result.projectedUsage,
        limit: result.limit,
    };
}
