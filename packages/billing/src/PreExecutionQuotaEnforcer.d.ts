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
export declare function evaluatePreExecutionQuota(context: PreExecutionQuotaContext): PreExecutionQuotaDecision;
