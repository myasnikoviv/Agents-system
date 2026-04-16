import type { ServiceRegistryDefinition } from './ServiceRegistryContract';
import type { ServiceExecutionAdapterRegistry } from './adapters/ServiceExecutionAdapter';
import type { ServiceLifecycleEventBus } from './ServiceLifecycleEvents';
export interface ControlPlaneServiceRuntimeView {
    serviceId: string;
    runtime: string;
    desired: string;
    state: Record<string, unknown>;
}
export declare class ControlPlaneRuntimeManager {
    private readonly registry;
    private readonly adapters;
    private readonly events?;
    constructor(registry: ServiceRegistryDefinition, adapters: ServiceExecutionAdapterRegistry, events?: ServiceLifecycleEventBus);
    listServices(): string[];
    listLifecycleEvents(): Array<{
        kind: string;
        serviceId: string;
        reason: string | null;
        timestamp: string;
        source: string;
        actorId: string | null;
    }>;
    getDescriptor(serviceId: string): ServiceRegistryDefinition['services'][string];
    getStatus(serviceId: string): ControlPlaneServiceRuntimeView;
    start(serviceId: string, metadata?: {
        source?: string;
        actorId?: string | null;
    }): Promise<ControlPlaneServiceRuntimeView>;
    stop(serviceId: string, metadata?: {
        source?: string;
        actorId?: string | null;
    }): Promise<ControlPlaneServiceRuntimeView>;
    restart(serviceId: string, metadata?: {
        source?: string;
        actorId?: string | null;
    }): Promise<ControlPlaneServiceRuntimeView>;
    private requireService;
    private resolveAdapter;
    private resolveNodeSpec;
    private resolveDockerSpec;
}
