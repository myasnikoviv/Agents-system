export type UnifiedServiceStatus = 'idle' | 'running' | 'stopped' | 'failed' | 'crashed' | 'degraded' | 'unknown';
export interface ServiceExecutionRuntime {
    serviceId: string;
    status: UnifiedServiceStatus;
    pid?: number | null;
    containerId?: string | null;
    health?: string | null;
    [key: string]: unknown;
}
export interface ServiceExecutionAdapter<TSpec> {
    readonly adapterId: string;
    start(serviceId: string, spec: TSpec): Promise<ServiceExecutionRuntime>;
    stop(serviceId: string): Promise<ServiceExecutionRuntime>;
    restart(serviceId: string, specOverride?: Partial<TSpec>): Promise<ServiceExecutionRuntime>;
    getRuntime(serviceId: string): ServiceExecutionRuntime;
}
export declare class ServiceExecutionAdapterRegistry {
    private readonly adapters;
    register<TSpec>(adapter: ServiceExecutionAdapter<TSpec>): void;
    get<TSpec>(adapterId: string): ServiceExecutionAdapter<TSpec>;
    listAdapterIds(): string[];
}
