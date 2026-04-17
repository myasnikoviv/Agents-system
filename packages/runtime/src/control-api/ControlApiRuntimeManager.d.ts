import type { ServiceRegistryDefinition } from './ServiceRegistryContract';
import type { ServiceExecutionAdapterRegistry } from './adapters/ServiceExecutionAdapter';
import type { ServiceLifecycleEventBus } from './ServiceLifecycleEvents';
export interface ControlApiServiceRuntimeView {
    serviceId: string;
    runtime: string;
    desired: string;
    state: Record<string, unknown>;
}
export declare class ControlApiRuntimeManager {
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
    getStatus(serviceId: string): ControlApiServiceRuntimeView;
    start(serviceId: string, metadata?: {
        source?: string;
        actorId?: string | null;
    }): Promise<ControlApiServiceRuntimeView>;
    stop(serviceId: string, metadata?: {
        source?: string;
        actorId?: string | null;
    }): Promise<ControlApiServiceRuntimeView>;
    restart(serviceId: string, metadata?: {
        source?: string;
        actorId?: string | null;
    }): Promise<ControlApiServiceRuntimeView>;
    private requireService;
    private resolveAdapter;
    private resolveNodeSpec;
    private resolveDockerSpec;
}
