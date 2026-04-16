import type { ServiceDescriptor } from './ServiceRegistryContract';
import type { ServiceExecutionRuntime } from './adapters/ServiceExecutionAdapter';

export type HealthEvaluationStatus = 'healthy' | 'degraded' | 'unknown';

export interface HealthCheckResult {
  serviceId: string;
  status: HealthEvaluationStatus;
  reason: string | null;
  checkedAt: string;
}

export interface HealthCheckProbes {
  httpProbe?: (input: { endpoint: string; timeoutMs: number; expectedStatus: number }) => Promise<{ statusCode: number }>;
  heartbeatProbe?: (input: { serviceId: string; timeoutMs: number }) => Promise<{ alive: boolean; lagMs?: number }>;
  processProbe?: (input: { serviceId: string }) => Promise<{ alive: boolean }>;
}

export interface HealthLoopOptions {
  defaultIntervalMs?: number;
}

export interface HealthLoopBindings {
  listServiceIds: () => string[];
  getDescriptor: (serviceId: string) => ServiceDescriptor;
  getRuntime: (serviceId: string) => ServiceExecutionRuntime;
  onResult: (result: HealthCheckResult) => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function protocolOf(descriptor: ServiceDescriptor): 'http' | 'heartbeat' | 'process' | 'none' {
  return descriptor.health?.protocol || 'none';
}

export class HealthCheckSystem {
  private readonly probes: Required<HealthCheckProbes>;
  private readonly defaultIntervalMs: number;
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private running = false;

  constructor(probes?: HealthCheckProbes, options?: HealthLoopOptions) {
    this.probes = {
      httpProbe:
        probes?.httpProbe ||
        (async ({ endpoint }) => {
          // Default lightweight fetch probe (Node 18+).
          const response = await fetch(endpoint);
          return { statusCode: response.status };
        }),
      heartbeatProbe:
        probes?.heartbeatProbe ||
        (async () => {
          return { alive: true, lagMs: 0 };
        }),
      processProbe:
        probes?.processProbe ||
        (async () => {
          return { alive: true };
        }),
    };
    this.defaultIntervalMs = Math.max(100, Number(options?.defaultIntervalMs || 2000));
  }

  isRunning(): boolean {
    return this.running;
  }

  async evaluate(serviceId: string, descriptor: ServiceDescriptor, runtime: ServiceExecutionRuntime): Promise<HealthCheckResult> {
    const checkedAt = nowIso();
    const protocol = protocolOf(descriptor);

    if (protocol === 'none') {
      return {
        serviceId,
        status: runtime.status === 'running' ? 'healthy' : 'degraded',
        reason: runtime.status === 'running' ? null : `runtime_not_running:${runtime.status}`,
        checkedAt,
      };
    }

    if (protocol === 'http') {
      const endpoint = descriptor.health?.endpoint;
      if (!endpoint) {
        return { serviceId, status: 'unknown', reason: 'health_http_endpoint_missing', checkedAt };
      }
      const timeoutMs = Math.max(100, Number(descriptor.health?.timeoutMs || 1000));
      const expectedStatus = Number(descriptor.health?.expectedStatus || 200);
      try {
        const probe = await this.probes.httpProbe({ endpoint, timeoutMs, expectedStatus });
        const ok = probe.statusCode === expectedStatus;
        return {
          serviceId,
          status: ok ? 'healthy' : 'degraded',
          reason: ok ? null : `http_status_mismatch:${probe.statusCode}!=${expectedStatus}`,
          checkedAt,
        };
      } catch (error: any) {
        return {
          serviceId,
          status: 'degraded',
          reason: `http_probe_failed:${String(error?.message || error)}`,
          checkedAt,
        };
      }
    }

    if (protocol === 'heartbeat') {
      const timeoutMs = Math.max(100, Number(descriptor.health?.timeoutMs || 1000));
      try {
        const probe = await this.probes.heartbeatProbe({ serviceId, timeoutMs });
        return {
          serviceId,
          status: probe.alive ? 'healthy' : 'degraded',
          reason: probe.alive ? null : 'heartbeat_missing',
          checkedAt,
        };
      } catch (error: any) {
        return {
          serviceId,
          status: 'degraded',
          reason: `heartbeat_probe_failed:${String(error?.message || error)}`,
          checkedAt,
        };
      }
    }

    try {
      const probe = await this.probes.processProbe({ serviceId });
      return {
        serviceId,
        status: probe.alive ? 'healthy' : 'degraded',
        reason: probe.alive ? null : 'process_not_alive',
        checkedAt,
      };
    } catch (error: any) {
      return {
        serviceId,
        status: 'degraded',
        reason: `process_probe_failed:${String(error?.message || error)}`,
        checkedAt,
      };
    }
  }

  async runOnce(bindings: HealthLoopBindings): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const serviceId of bindings.listServiceIds()) {
      const descriptor = bindings.getDescriptor(serviceId);
      const runtime = bindings.getRuntime(serviceId);
      const result = await this.evaluate(serviceId, descriptor, runtime);
      bindings.onResult(result);
      results.push(result);
    }
    return results;
  }

  start(bindings: HealthLoopBindings): void {
    if (this.running) return;
    this.running = true;

    for (const serviceId of bindings.listServiceIds()) {
      const descriptor = bindings.getDescriptor(serviceId);
      const intervalMs = Math.max(100, Number(descriptor.health?.intervalMs || this.defaultIntervalMs));
      // Run first check immediately to avoid blind startup window.
      void this.evaluate(serviceId, descriptor, bindings.getRuntime(serviceId)).then((result) => bindings.onResult(result));
      const timer = setInterval(async () => {
        if (!this.running) return;
        const runtime = bindings.getRuntime(serviceId);
        const result = await this.evaluate(serviceId, descriptor, runtime);
        bindings.onResult(result);
      }, intervalMs);
      this.timers.set(serviceId, timer);
    }
  }

  stop(): void {
    this.running = false;
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }
}
