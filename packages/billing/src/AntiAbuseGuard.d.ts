export interface AbuseCheckInput {
    tenantId: string;
    actorId: string;
    nowMs?: number;
    actionKey: string;
}
export interface AbuseCheckResult {
    allowed: boolean;
    reason: string;
}
export declare function evaluateAntiAbuse(input: AbuseCheckInput): AbuseCheckResult;
export declare function validateTenantIsolation(input: {
    tenantId: string;
    resourceTenantId: string;
}): AbuseCheckResult;
