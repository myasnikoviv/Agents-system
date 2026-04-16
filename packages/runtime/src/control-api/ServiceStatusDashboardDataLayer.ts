import type { ControlApiRuntimeManager } from './ControlApiRuntimeManager';

export interface ServiceStatusDashboardSnapshot {
  generatedAt: string;
  environment: {
    nodeEnv: string;
    host: string;
    profile: string;
  };
  totals: {
    total: number;
    running: number;
    stopped: number;
    failed: number;
    degraded: number;
  };
  restartCounts: {
    total: number;
    byService: Record<string, number>;
  };
  healthSummary: {
    healthy: number;
    degraded: number;
    unknown: number;
  };
  services: Array<{
    serviceId: string;
    runtime: string;
    desired: string;
    status: string;
    restartCount: number;
  }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function healthBucket(status: string): 'healthy' | 'degraded' | 'unknown' {
  if (status === 'running' || status === 'healthy' || status === 'starting') return 'healthy';
  if (status === 'failed' || status === 'crashed' || status === 'degraded' || status === 'stopped') return 'degraded';
  return 'unknown';
}

export function buildServiceStatusDashboardSnapshot(manager: ControlApiRuntimeManager): ServiceStatusDashboardSnapshot {
  const serviceIds = manager.listServices();
  const services = serviceIds.map((serviceId) => {
    const row = manager.getStatus(serviceId);
    const rawStatus = String((row.state as any)?.status || 'unknown');
    return {
      serviceId,
      runtime: row.runtime,
      desired: row.desired,
      status: rawStatus,
      restartCount: Number((row.state as any)?.restartCount || 0),
    };
  });

  const totals = {
    total: services.length,
    running: services.filter((s) => s.status === 'running' || s.status === 'healthy' || s.status === 'starting').length,
    stopped: services.filter((s) => s.status === 'stopped').length,
    failed: services.filter((s) => s.status === 'failed' || s.status === 'crashed').length,
    degraded: services.filter((s) => s.status === 'degraded').length,
  };

  const healthSummary = {
    healthy: services.filter((s) => healthBucket(s.status) === 'healthy').length,
    degraded: services.filter((s) => healthBucket(s.status) === 'degraded').length,
    unknown: services.filter((s) => healthBucket(s.status) === 'unknown').length,
  };

  const restartByService = Object.fromEntries(services.map((s) => [s.serviceId, s.restartCount]));
  const restartTotal = services.reduce((sum, s) => sum + s.restartCount, 0);

  return {
    generatedAt: nowIso(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      host: process.env.HOSTNAME || 'local',
      profile: process.env.RUNTIME_PROFILE || 'local',
    },
    totals,
    restartCounts: {
      total: restartTotal,
      byService: restartByService,
    },
    healthSummary,
    services,
  };
}
