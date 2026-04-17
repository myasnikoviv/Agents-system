import type { ServiceRegistryDefinition } from './ServiceRegistryContract';
import type { ServiceExecutionAdapterRegistry } from './adapters/ServiceExecutionAdapter';
import type { LocalProcessServiceSpec } from './LocalProcessAdapter';
import type { DockerServiceSpec } from './DockerAdapter';
import type { ServiceLifecycleEventBus } from './ServiceLifecycleEvents';
import { RestartPolicyEngine } from './RestartPolicyEngine';
import { CrashForensicsStore } from './CrashForensicsStore';

export interface ControlApiServiceRuntimeView {
  serviceId: string;
  runtime: string;
  desired: string;
  state: Record<string, unknown>;
}

export class ControlApiRuntimeManager {
  private readonly restartPolicyEngine: RestartPolicyEngine;
  private readonly forensics: CrashForensicsStore;
  private readonly restartCounters = new Map<string, number>();
  private readonly pendingRestarts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly registry: ServiceRegistryDefinition,
    private readonly adapters: ServiceExecutionAdapterRegistry,
    private readonly events?: ServiceLifecycleEventBus,
    options?: { restartPolicyEngine?: RestartPolicyEngine; forensics?: CrashForensicsStore },
  ) {
    this.restartPolicyEngine = options?.restartPolicyEngine || new RestartPolicyEngine();
    this.forensics = options?.forensics || new CrashForensicsStore();
  }

  listServices(): string[] {
    return Object.keys(this.registry.services);
  }

  listLifecycleEvents(): Array<{ kind: string; serviceId: string; reason: string | null; timestamp: string; source: string; actorId: string | null }> {
    return this.events ? this.events.list() : [];
  }

  listIncidents(filter?: { serviceId?: string; limit?: number }) {
    return this.forensics.listIncidents(filter);
  }

  getIncident(incidentId: string) {
    return this.forensics.getIncident(incidentId);
  }

  getDescriptor(serviceId: string): ServiceRegistryDefinition['services'][string] {
    return this.requireService(serviceId);
  }

  canManualRestart(serviceId: string): { allowed: boolean; reason: string } {
    const descriptor = this.requireService(serviceId);
    const mode = String(descriptor.desired?.restartPolicy?.mode || 'on-failure');
    if (mode === 'never') {
      return { allowed: false, reason: 'restart_policy_never_manual_restart_forbidden' };
    }
    return { allowed: true, reason: `manual_restart_allowed_mode_${mode}` };
  }

  getStatus(serviceId: string): ControlApiServiceRuntimeView {
    const descriptor = this.registry.services[serviceId];
    if (!descriptor) throw new Error(`control_plane_service_not_found:${serviceId}`);
    const adapter = this.resolveAdapter(descriptor.runtime);
    const state = adapter.getRuntime(serviceId);
    if (state.status === 'failed' || state.status === 'crashed') {
      this.events?.emit('service.failed', serviceId, String((state as any).crashReason || (state as any).errorReason || 'failed'));
      this.enforceRestartPolicy(serviceId, descriptor, state);
    } else if (state.status === 'degraded') {
      this.events?.emit('service.degraded', serviceId, String((state as any).errorReason || 'degraded'));
      this.enforceRestartPolicy(serviceId, descriptor, state);
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
    this.restartCounters.set(serviceId, Number(this.restartCounters.get(serviceId) || 0) + 1);
    this.events?.emit('service.restarted', serviceId, null, metadata);
    return this.getStatus(serviceId);
  }

  private enforceRestartPolicy(
    serviceId: string,
    descriptor: ServiceRegistryDefinition['services'][string],
    state: Record<string, unknown>,
  ): void {
    if (this.pendingRestarts.has(serviceId)) return;
    const runtimeStatus = String(state.status || 'unknown');
    const reason = String((state as any).crashReason || (state as any).errorReason || '').trim() || null;
    const runtimeLike = {
      serviceId,
      desired: descriptor.desired.state,
      status: runtimeStatus === 'crashed' ? 'failed' : (runtimeStatus as any),
      restartCount: Number(this.restartCounters.get(serviceId) || 0),
      lastCheckAt: new Date().toISOString(),
      errorReason: reason,
    };
    const decision = this.restartPolicyEngine.decide(serviceId, descriptor, runtimeLike);
    const incident = this.forensics.recordFailure({
      serviceId,
      runtimeStatus,
      reason,
      restartCount: runtimeLike.restartCount,
      decision,
      runtimeSnapshot: { ...state },
    });
    if (!decision.allowed) {
      return;
    }
    const timer = setTimeout(() => {
      void this.restart(serviceId, { source: 'self-healing-supervisor', actorId: null })
        .then(() => {
          this.restartPolicyEngine.recordRestart(serviceId);
          this.forensics.markRestartOutcome(incident.incidentId, 'restarted');
        })
        .catch((error: any) => {
          this.events?.emit('service.failed', serviceId, String(error?.message || 'restart_failed'), {
            source: 'self-healing-supervisor',
            actorId: null,
          });
          this.forensics.markRestartOutcome(incident.incidentId, 'restart_failed', String(error?.message || 'restart_failed'));
        })
        .finally(() => {
          this.pendingRestarts.delete(serviceId);
        });
    }, decision.delayMs);
    this.pendingRestarts.set(serviceId, timer);
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
