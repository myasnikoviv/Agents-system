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
export declare class QuotaEngine {
    evaluate(input: QuotaEvaluationInput): QuotaEvaluationResult;
}
