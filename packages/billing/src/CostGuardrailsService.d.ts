export interface CostGuardrailsFilter {
    projectId?: string;
    workspaceId?: string;
    dayIsoDate?: string;
}
export interface CostGuardrailsResult {
    status: 'ok' | 'warn' | 'block';
    scope: {
        projectId: string;
        workspaceId: string;
        dayIsoDate: string;
    };
    totals: {
        dayCostUsd: number;
        tenantDayCostUsd: number;
    };
    limits: {
        dayLimitUsd: number;
        tenantDayLimitUsd: number;
        alertThresholdRatio: number;
    };
    alerts: Array<{
        code: 'cost_day_near_limit' | 'cost_day_exceeded' | 'cost_tenant_day_exceeded' | 'anomaly_usage_spike';
        severity: 'info' | 'warning' | 'critical';
        message: string;
    }>;
}
export declare class CostGuardrailsService {
    evaluate(workspacePath: string, filter?: CostGuardrailsFilter): CostGuardrailsResult;
}
