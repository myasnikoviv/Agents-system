import type { ControlPlaneRuntimeManager } from './ControlPlaneRuntimeManager';
export interface PlatformBootResult {
    startedAt: string;
    finishedAt: string;
    launchOrder: string[];
    services: Array<{
        serviceId: string;
        status: string;
        runtime: string;
    }>;
    success: boolean;
}
export declare class LocalPlatformBootOrchestrator {
    private readonly manager;
    constructor(manager: ControlPlaneRuntimeManager);
    bootAll(): Promise<PlatformBootResult>;
    private resolveBootOrder;
}
