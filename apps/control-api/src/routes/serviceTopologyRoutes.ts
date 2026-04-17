import net from 'net';
import type express from 'express';

type ServiceState = 'up' | 'degraded' | 'down';

interface HttpProbeResult {
  ok: boolean;
  statusCode?: number;
  durationMs: number;
  error?: string;
}

interface TopologyService {
  id: string;
  kind: 'app' | 'infra';
  visibility: 'public' | 'internal';
  version: string;
  endpoints: {
    liveness?: string;
    readiness?: string;
  };
  probes: {
    liveness?: HttpProbeResult;
    readiness?: HttpProbeResult;
  };
  state: ServiceState;
  dependencies: string[];
}

interface ServiceTopologyRouteDeps {
  requireRole: (
    req: express.Request,
    res: express.Response,
    role?: string,
  ) => { userId?: string; role?: string } | null;
  getPort: () => number;
  getRuntimeProfile: () => string;
  getInfrastructureProfile: () => {
    dispatchQueueBackend: string;
    sharedWorkerStateBackend: string;
    secretsBackend: string;
    objectStorageBackend: string;
  };
  getPostgresHealth: () => Promise<{ enabled: boolean; ok: boolean; error?: string }>;
}

const resolveStateFromProbes = (input: { liveness?: HttpProbeResult; readiness?: HttpProbeResult }): ServiceState => {
  const checks = [input.liveness, input.readiness].filter(Boolean) as HttpProbeResult[];
  if (checks.length === 0) return 'down';
  if (checks.every((x) => x.ok)) return 'up';
  if (checks.some((x) => x.ok)) return 'degraded';
  return 'down';
};

const httpProbe = async (url: string): Promise<HttpProbeResult> => {
  const startedAt = Date.now();
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 3000);
  try {
    const response = await fetch(url, { signal: ctrl.signal });
    return {
      ok: response.ok,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      ...(response.ok ? {} : { error: `http_${response.status}` }),
    };
  } catch (error: any) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: String(error?.message || 'probe_failed'),
    };
  } finally {
    clearTimeout(timeout);
  }
};

const tcpProbe = async (host: string, port: number): Promise<{ ok: boolean; durationMs: number; error?: string }> => {
  const startedAt = Date.now();
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, durationMs: Date.now() - startedAt, error: 'timeout' });
    }, 3000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve({ ok: true, durationMs: Date.now() - startedAt });
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, durationMs: Date.now() - startedAt, error: String((error as any)?.message || 'connection_failed') });
    });
  });
};

const parseRedisUrl = (rawValue: string): { host: string; port: number } | null => {
  const raw = String(rawValue || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname;
    const port = Number(parsed.port || 6379);
    if (!host || !Number.isFinite(port) || port <= 0) return null;
    return { host, port };
  } catch {
    return null;
  }
};

export function registerServiceTopologyRoutes(app: express.Express, deps: ServiceTopologyRouteDeps): void {
  const withMember = (req: express.Request, res: express.Response): boolean => !!deps.requireRole(req, res, 'member');

  const buildTopology = async () => {
    const controlApiBase = String(process.env.CONTROL_API_BASE_URL || `http://127.0.0.1:${deps.getPort()}`).replace(/\/$/, '');
    const runtimeBase = String(process.env.RUNTIME_ENGINE_BASE_URL || 'http://127.0.0.1:3002').replace(/\/$/, '');
    const clientBase = String(process.env.CLIENT_APP_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
    const redisUrl = String(process.env.REDIS_URL || '').trim();

    const [controlLive, controlReady, runtimeLive, runtimeReady, clientLive, pgHealth] = await Promise.all([
      httpProbe(`${controlApiBase}/api/health`),
      httpProbe(`${controlApiBase}/api/health/readiness/dispatch`),
      httpProbe(`${runtimeBase}/health`),
      httpProbe(`${runtimeBase}/ready`),
      httpProbe(`${clientBase}/`),
      deps.getPostgresHealth(),
    ]);

    const redisProbeInput = parseRedisUrl(redisUrl);
    const redisProbe = redisProbeInput
      ? await tcpProbe(redisProbeInput.host, redisProbeInput.port)
      : { ok: false, durationMs: 0, error: 'redis_url_not_set' };

    const profile = deps.getInfrastructureProfile();
    const services: TopologyService[] = [
      {
        id: 'client-app',
        kind: 'app',
        visibility: 'public',
        version: '1.0.0',
        endpoints: { liveness: `${clientBase}/`, readiness: `${clientBase}/` },
        probes: { liveness: clientLive, readiness: clientLive },
        state: resolveStateFromProbes({ liveness: clientLive, readiness: clientLive }),
        dependencies: ['control-api'],
      },
      {
        id: 'control-api',
        kind: 'app',
        visibility: 'public',
        version: '1.0.0',
        endpoints: { liveness: `${controlApiBase}/api/health`, readiness: `${controlApiBase}/api/health/readiness/dispatch` },
        probes: { liveness: controlLive, readiness: controlReady },
        state: resolveStateFromProbes({ liveness: controlLive, readiness: controlReady }),
        dependencies: ['postgres', 'redis'],
      },
      {
        id: 'runtime-engine',
        kind: 'app',
        visibility: 'internal',
        version: '1.0.0',
        endpoints: { liveness: `${runtimeBase}/health`, readiness: `${runtimeBase}/ready` },
        probes: { liveness: runtimeLive, readiness: runtimeReady },
        state: resolveStateFromProbes({ liveness: runtimeLive, readiness: runtimeReady }),
        dependencies: ['postgres', 'redis', 'control-api'],
      },
      {
        id: 'postgres',
        kind: 'infra',
        visibility: 'internal',
        version: '16',
        endpoints: {},
        probes: {
          liveness: {
            ok: pgHealth.ok,
            durationMs: 0,
            ...(pgHealth.ok ? {} : { error: pgHealth.error || 'postgres_unhealthy' }),
          },
        },
        state: pgHealth.ok ? 'up' : 'down',
        dependencies: [],
      },
      {
        id: 'redis',
        kind: 'infra',
        visibility: 'internal',
        version: '7',
        endpoints: {},
        probes: {
          liveness: {
            ok: redisProbe.ok,
            durationMs: redisProbe.durationMs,
            ...(redisProbe.ok ? {} : { error: redisProbe.error || 'redis_unhealthy' }),
          },
        },
        state: redisProbe.ok ? 'up' : 'down',
        dependencies: [],
      },
    ];

    const errorSurface = services
      .flatMap((service) => {
        const issues: Array<{ serviceId: string; probe: string; error: string }> = [];
        const livenessError = service.probes.liveness && !service.probes.liveness.ok
          ? service.probes.liveness.error || 'liveness_failed'
          : null;
        const readinessError = service.probes.readiness && !service.probes.readiness.ok
          ? service.probes.readiness.error || 'readiness_failed'
          : null;
        if (livenessError) issues.push({ serviceId: service.id, probe: 'liveness', error: livenessError });
        if (readinessError) issues.push({ serviceId: service.id, probe: 'readiness', error: readinessError });
        return issues;
      });

    return {
      success: true,
      schema: 'agsys.service-topology.v1',
      timestamp: new Date().toISOString(),
      runtimeProfile: deps.getRuntimeProfile(),
      infrastructureProfile: profile,
      summary: {
        total: services.length,
        up: services.filter((s) => s.state === 'up').length,
        degraded: services.filter((s) => s.state === 'degraded').length,
        down: services.filter((s) => s.state === 'down').length,
      },
      services,
      dependencies: services.map((service) => ({
        serviceId: service.id,
        dependsOn: service.dependencies,
      })),
      errorSurface,
    };
  };

  app.get('/api/system/topology/services', async (req, res) => {
    if (!withMember(req, res)) return;
    try {
      const topology = await buildTopology();
      res.json({
        success: true,
        schema: topology.schema,
        timestamp: topology.timestamp,
        summary: topology.summary,
        services: topology.services,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'topology_services_failed', message: error?.message || 'Failed to build services topology' });
    }
  });

  app.get('/api/system/topology/snapshot', async (req, res) => {
    if (!withMember(req, res)) return;
    try {
      const topology = await buildTopology();
      res.json(topology);
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'topology_snapshot_failed', message: error?.message || 'Failed to build topology snapshot' });
    }
  });
}
