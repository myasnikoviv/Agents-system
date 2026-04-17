import {
  ServiceRegistryDefinition,
  ServiceDescriptor,
  DesiredServiceState,
} from './ServiceRegistryContract';
import { loadServiceRegistry } from './ServiceRegistryLoader';
import type { ControlApiServiceStateStore } from './ServiceStateStore';

export type ServiceRuntimeStatus = 'starting' | 'healthy' | 'degraded' | 'failed' | 'stopped';

export interface ServiceRuntimeState {
  serviceId: string;
  desired: DesiredServiceState;
  status: ServiceRuntimeStatus;
  restartCount: number;
  lastCheckAt: string | null;
  errorReason: string | null;
}

export interface ControlApiSnapshot {
  generatedAt: string;
  services: Array<{
    serviceId: string;
    descriptor: ServiceDescriptor;
    state: ServiceRuntimeState;
  }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStatusByDesired(desired: ServiceDescriptor['desired']): ServiceRuntimeStatus {
  return desired.state === 'running' ? 'starting' : 'stopped';
}

export class ControlApiCore {
  private readonly registry: ServiceRegistryDefinition;
  private readonly state = new Map<string, ServiceRuntimeState>();
  private readonly stateStore?: ControlApiServiceStateStore;

  constructor(registry: ServiceRegistryDefinition, options?: { stateStore?: ControlApiServiceStateStore }) {
    this.registry = registry;
    this.stateStore = options?.stateStore;
    for (const [serviceId, descriptor] of Object.entries(registry.services)) {
      const persisted = this.stateStore?.get(serviceId);
      this.state.set(serviceId, {
        serviceId,
        desired: persisted?.desired || descriptor.desired.state,
        status: persisted?.status || defaultStatusByDesired(descriptor.desired),
        restartCount: Number(persisted?.restartCount || 0),
        lastCheckAt: persisted?.lastCheckAt || null,
        errorReason: persisted?.errorReason || null,
      });
      if (!persisted) {
        this.stateStore?.upsert(this.state.get(serviceId)!);
      }
    }
  }

  static fromRegistryPath(sourcePath: string, options?: { stateStore?: ControlApiServiceStateStore }): ControlApiCore {
    const loaded = loadServiceRegistry(sourcePath);
    return new ControlApiCore(loaded.registry, options);
  }

  getRegistry(): ServiceRegistryDefinition {
    return this.registry;
  }

  getDescriptor(serviceId: string): ServiceDescriptor {
    const descriptor = this.registry.services[serviceId];
    if (!descriptor) throw new Error(`control_plane_service_not_found:${serviceId}`);
    return descriptor;
  }

  getState(serviceId: string): ServiceRuntimeState {
    const row = this.state.get(serviceId);
    if (!row) throw new Error(`control_plane_service_state_not_found:${serviceId}`);
    return { ...row };
  }

  setStatus(input: {
    serviceId: string;
    status: ServiceRuntimeStatus;
    errorReason?: string | null;
    checkedAt?: string;
    incrementRestart?: boolean;
  }): ServiceRuntimeState {
    const current = this.state.get(input.serviceId);
    if (!current) throw new Error(`control_plane_service_state_not_found:${input.serviceId}`);

    const next: ServiceRuntimeState = {
      ...current,
      status: input.status,
      lastCheckAt: input.checkedAt || nowIso(),
      errorReason: input.errorReason ?? null,
      restartCount: current.restartCount + (input.incrementRestart ? 1 : 0),
    };
    this.state.set(input.serviceId, next);
    this.stateStore?.upsert(next);
    return { ...next };
  }

  setDesired(serviceId: string, desired: ServiceDescriptor['desired']): ServiceRuntimeState {
    const descriptor = this.getDescriptor(serviceId);
    descriptor.desired = desired;

    const current = this.state.get(serviceId);
    if (!current) throw new Error(`control_plane_service_state_not_found:${serviceId}`);
    const next: ServiceRuntimeState = {
      ...current,
      desired: desired.state,
      lastCheckAt: nowIso(),
    };
    this.state.set(serviceId, next);
    this.stateStore?.upsert(next);
    return { ...next };
  }

  listServiceIds(): string[] {
    return Object.keys(this.registry.services);
  }

  snapshot(): ControlApiSnapshot {
    return {
      generatedAt: nowIso(),
      services: this.listServiceIds().map((serviceId) => ({
        serviceId,
        descriptor: this.getDescriptor(serviceId),
        state: this.getState(serviceId),
      })),
    };
  }
}
