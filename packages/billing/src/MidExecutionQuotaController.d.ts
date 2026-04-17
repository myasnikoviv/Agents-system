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
export declare function evaluateMidExecutionQuota(input: MidExecutionQuotaInput): MidExecutionQuotaResult;
