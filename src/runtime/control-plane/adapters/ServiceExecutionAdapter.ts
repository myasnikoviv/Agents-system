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

export class ServiceExecutionAdapterRegistry {
  private readonly adapters = new Map<string, ServiceExecutionAdapter<unknown>>();

  register<TSpec>(adapter: ServiceExecutionAdapter<TSpec>): void {
    this.adapters.set(adapter.adapterId, adapter as ServiceExecutionAdapter<unknown>);
  }

  get<TSpec>(adapterId: string): ServiceExecutionAdapter<TSpec> {
    const found = this.adapters.get(adapterId);
    if (!found) throw new Error(`service_execution_adapter_not_found:${adapterId}`);
    return found as ServiceExecutionAdapter<TSpec>;
  }

  listAdapterIds(): string[] {
    return Array.from(this.adapters.keys()).sort();
  }
}
