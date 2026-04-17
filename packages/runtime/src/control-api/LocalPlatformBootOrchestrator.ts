import type { ControlApiRuntimeManager } from './ControlApiRuntimeManager';

export interface PlatformBootResult {
  startedAt: string;
  finishedAt: string;
  launchOrder: string[];
  services: Array<{ serviceId: string; status: string; runtime: string }>;
  success: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function runtimeOrder(runtime: string): number {
  if (runtime === 'docker') return 0;
  if (runtime === 'node') return 1;
  return 2;
}

export class LocalPlatformBootOrchestrator {
  constructor(private readonly manager: ControlApiRuntimeManager) {}

  async bootAll(): Promise<PlatformBootResult> {
    const startedAt = nowIso();
    const sorted = this.resolveBootOrder();

    const launchOrder: string[] = [];
    for (const row of sorted) {
      await this.manager.start(row.serviceId);
      launchOrder.push(row.serviceId);
    }

    const services = this.manager.listServices().map((serviceId) => {
      const status = this.manager.getStatus(serviceId);
      return {
        serviceId,
        status: String((status.state as any)?.status || 'unknown'),
        runtime: status.runtime,
      };
    });

    const success = services.every((s) => s.status === 'running' || s.status === 'healthy' || s.status === 'starting');
    return {
      startedAt,
      finishedAt: nowIso(),
      launchOrder,
      services,
      success,
    };
  }

  private resolveBootOrder(): Array<{ serviceId: string; runtime: string }> {
    const nodes = this.manager.listServices().map((serviceId) => {
      const status = this.manager.getStatus(serviceId);
      const descriptor = this.manager.getDescriptor(serviceId) as any;
      const deps = Array.isArray(descriptor?.dependsOn)
        ? descriptor.dependsOn.map((x: any) => String(x))
        : Array.isArray(descriptor?.metadata?.dependsOn)
          ? descriptor.metadata.dependsOn.map((x: any) => String(x))
          : [];
      return {
        serviceId,
        runtime: status.runtime,
        dependsOn: deps,
      };
    });

    const known = new Set(nodes.map((n) => n.serviceId));
    const pending = new Map(nodes.map((n) => [n.serviceId, n]));
    const resolved: Array<{ serviceId: string; runtime: string }> = [];

    while (pending.size > 0) {
      const ready = Array.from(pending.values())
        .filter((n) => n.dependsOn.filter((d) => known.has(d)).every((d) => resolved.some((r) => r.serviceId === d)))
        .sort((a, b) => runtimeOrder(a.runtime) - runtimeOrder(b.runtime) || a.serviceId.localeCompare(b.serviceId));
      if (ready.length === 0) {
        // defaultValue for circular dependency: deterministic runtime/name ordering
        const defaultValue = Array.from(pending.values()).sort(
          (a, b) => runtimeOrder(a.runtime) - runtimeOrder(b.runtime) || a.serviceId.localeCompare(b.serviceId),
        )[0];
        resolved.push({ serviceId: defaultValue.serviceId, runtime: defaultValue.runtime });
        pending.delete(defaultValue.serviceId);
        continue;
      }

      for (const item of ready) {
        resolved.push({ serviceId: item.serviceId, runtime: item.runtime });
        pending.delete(item.serviceId);
      }
    }

    return resolved;
  }
}
