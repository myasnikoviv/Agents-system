import type { BillingQuota } from './BillingDomainModel';

export interface QuotaEvaluationInput {
  quota: BillingQuota;
  currentUsage: number;
  requestedUsage: number;
  burstAllowance?: number;
}

export interface QuotaEvaluationResult {
  decision: 'allow' | 'warn' | 'block';
  reason: string;
  limit: number;
  projectedUsage: number;
}

export class QuotaEngine {
  evaluate(input: QuotaEvaluationInput): QuotaEvaluationResult {
    const currentUsage = Math.max(0, Number(input.currentUsage || 0));
    const requestedUsage = Math.max(0, Number(input.requestedUsage || 0));
    const burstAllowance = Math.max(0, Number(input.burstAllowance || 0));
    const hardLimit = Math.max(0, Number(input.quota.limit || 0));
    const softLimit =
      typeof input.quota.softLimit === 'number' ? Math.max(0, Number(input.quota.softLimit)) : null;
    const projectedUsage = currentUsage + requestedUsage;

    if (hardLimit <= 0) {
      return {
        decision: 'block',
        reason: 'quota_hard_limit_zero',
        limit: hardLimit,
        projectedUsage,
      };
    }

    if (projectedUsage > hardLimit + burstAllowance) {
      return {
        decision: 'block',
        reason: 'quota_hard_limit_exceeded',
        limit: hardLimit,
        projectedUsage,
      };
    }

    if (softLimit !== null && projectedUsage > softLimit) {
      return {
        decision: 'warn',
        reason: 'quota_soft_limit_exceeded',
        limit: hardLimit,
        projectedUsage,
      };
    }

    return {
      decision: 'allow',
      reason: 'quota_ok',
      limit: hardLimit,
      projectedUsage,
    };
  }
}

