import type { ServiceRegistryDefinition } from './ServiceRegistryContract';
import type { ServiceExecutionAdapterRegistry } from './adapters/ServiceExecutionAdapter';
import type { LocalProcessServiceSpec } from './LocalProcessAdapter';
import type { DockerServiceSpec } from './DockerAdapter';
import type { ServiceLifecycleEventBus } from './ServiceLifecycleEvents';

export interface ControlApiServiceRuntimeView {
  serviceId: string;
  runtime: string;
  desired: string;
  state: Record<string, unknown>;
}

export class ControlApiRuntimeManager {
  constructor(
    private readonly registry: ServiceRegistryDefinition,
    private readonly adapters: ServiceExecutionAdapterRegistry,
    private readonly events?: ServiceLifecycleEventBus,
  ) {}

  listServices(): string[] {
    return Object.keys(this.registry.services);
  }

  listLifecycleEvents(): Array<{ kind: string; serviceId: string; reason: string | null; timestamp: string; source: string; actorId: string | null }> {
    return this.events ? this.events.list() : [];
  }

  getDescriptor(serviceId: string): ServiceRegistryDefinition['services'][string] {
    return this.requireService(serviceId);
  }

  getStatus(serviceId: string): ControlApiServiceRuntimeView {
    const descriptor = this.registry.services[serviceId];
    if (!descriptor) throw new Error(`control_plane_service_not_found:${serviceId}`);
    const adapter = this.resolveAdapter(descriptor.runtime);
    const state = adapter.getRuntime(serviceId);
    if (state.status === 'failed' || state.status === 'crashed') {
      this.events?.emit('service.failed', serviceId, String((state as any).crashReason || (state as any).errorReason || 'failed'));
    } else if (state.status === 'degraded') {
      this.events?.emit('service.degraded', serviceId, String((state as any).errorReason || 'degraded'));
    }
    return {
      serviceId,
      runtime: descriptor.runtime,
      desired: descriptor.desired.state,
      state,
    };
  }

  async start(
    serviceId: string,
    metadata?: { source?: string; actorId?: string | null },
  ): Promise<ControlApiServiceRuntimeView> {
    const descriptor = this.requireService(serviceId);
    const adapter = this.resolveAdapter(descriptor.runtime);
    if (descriptor.runtime === 'node') {
      const spec = this.resolveNodeSpec(serviceId);
      const nodeAdapter = this.adapters.get<LocalProcessServiceSpec>('local-process');
      await nodeAdapter.start(serviceId, spec);
    } else if (descriptor.runtime === 'docker') {
      const spec = this.resolveDockerSpec(serviceId);
      const dockerAdapter = this.adapters.get<DockerServiceSpec>('docker');
      await dockerAdapter.start(serviceId, spec);
    } else {
      throw new Error(`control_plane_runtime_not_supported:${descriptor.runtime}`);
    }
    this.events?.emit('service.started', serviceId, null, metadata);
    return this.getStatus(serviceId);
  }

  async stop(
    serviceId: string,
    metadata?: { source?: string; actorId?: string | null },
  ): Promise<ControlApiServiceRuntimeView> {
    const descriptor = this.requireService(serviceId);
    const adapter = this.resolveAdapter(descriptor.runtime);
    await adapter.stop(serviceId);
    this.events?.emit('service.stopped', serviceId, null, metadata);
    return this.getStatus(serviceId);
  }

  async restart(
    serviceId: string,
    metadata?: { source?: string; actorId?: string | null },
  ): Promise<ControlApiServiceRuntimeView> {
    const descriptor = this.requireService(serviceId);
    const adapter = this.resolveAdapter(descriptor.runtime);
    await adapter.restart(serviceId);
    this.events?.emit('service.restarted', serviceId, null, metadata);
    return this.getStatus(serviceId);
  }

  private requireService(serviceId: string) {
    const descriptor = this.registry.services[serviceId];
    if (!descriptor) throw new Error(`control_plane_service_not_found:${serviceId}`);
    return descriptor;
  }

  private resolveAdapter(runtime: string) {
    if (runtime === 'node') return this.adapters.get<LocalProcessServiceSpec>('local-process');
    if (runtime === 'docker') return this.adapters.get<DockerServiceSpec>('docker');
    throw new Error(`control_plane_runtime_adapter_not_found:${runtime}`);
  }

  private resolveNodeSpec(serviceId: string): LocalProcessServiceSpec {
    const descriptor = this.requireService(serviceId);
    const entry = String(descriptor.entrypoint || '').trim();
    if (!entry) throw new Error(`control_plane_node_entrypoint_missing:${serviceId}`);
    return {
      command: entry,
      args: Array.isArray(descriptor.args) ? descriptor.args : [],
      env: descriptor.env || {},
    };
  }

  private resolveDockerSpec(serviceId: string): DockerServiceSpec {
    const descriptor = this.requireService(serviceId);
    const image = String((descriptor.metadata as any)?.image || '').trim();
    if (!image) throw new Error(`control_plane_docker_image_missing:${serviceId}`);
    return {
      image,
      containerName: `svc-${serviceId}`,
      env: descriptor.env || {},
      command: Array.isArray(descriptor.args) ? descriptor.args : undefined,
    };
  }
}
