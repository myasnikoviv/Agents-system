import { QuotaEngine } from './QuotaEngine';
import type { BillingQuota } from './BillingDomainModel';

export interface PreExecutionQuotaContext {
  quota?: BillingQuota;
  currentUsage?: number;
  requestedUsage?: number;
  burstAllowance?: number;
}

export interface PreExecutionQuotaDecision {
  allowed: boolean;
  decision?: 'allow' | 'warn' | 'block';
  reason?: string;
  message?: string;
  projectedUsage?: number;
  limit?: number;
}

const quotaEngine = new QuotaEngine();

export function evaluatePreExecutionQuota(context: PreExecutionQuotaContext): PreExecutionQuotaDecision {
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

