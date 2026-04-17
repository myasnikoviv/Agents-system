import { QuotaEngine } from './QuotaEngine';
import type { BillingQuota } from './BillingDomainModel';

export interface MidExecutionQuotaState {
  consumedUsage: number;
}

export interface MidExecutionQuotaInput {
  quota?: BillingQuota;
  state: MidExecutionQuotaState;
  incrementUsage: number;
  burstAllowance?: number;
}

export interface MidExecutionQuotaResult {
  continueExecution: boolean;
  reason: string;
  consumedUsage: number;
  projectedUsage: number;
}

const engine = new QuotaEngine();

export function evaluateMidExecutionQuota(input: MidExecutionQuotaInput): MidExecutionQuotaResult {
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

