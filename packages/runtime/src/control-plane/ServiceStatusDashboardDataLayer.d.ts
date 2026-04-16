import type { ControlPlaneRuntimeManager } from './ControlPlaneRuntimeManager';
export interface ServiceStatusDashboardSnapshot {
    generatedAt: string;
    environment: {
        nodeEnv: string;
        host: string;
        profile: string;
    };
    totals: {
        total: number;
        running: number;
        stopped: number;
        failed: number;
        degraded: number;
    };
    restartCounts: {
        total: number;
        byService: Record<string, number>;
    };
    healthSummary: {
        healthy: number;
        degraded: number;
        unknown: number;
    };
    services: Array<{
        serviceId: string;
        runtime: string;
        desired: string;
        status: string;
        restartCount: number;
    }>;
}
export declare function buildServiceStatusDashboardSnapshot(manager: ControlPlaneRuntimeManager): ServiceStatusDashboardSnapshot;
