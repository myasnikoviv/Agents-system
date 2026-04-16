import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('SLO status endpoint (AGSYS-3121)', () => {
  it('returns configured slo targets and compliance status', async () => {
    const app = express();
    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => [],
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => row,
      getSloStatus: async () => ({
        targets: { uptimePct: 99.9, p95LatencyMs: 1200, successRatePct: 99.0 },
        observed: { uptimePct: 99.95, avgLatencyMs: 300, successRatePct: 99.5, requestsTotal: 1000 },
        compliance: { uptime: true, latency: true, successRate: true },
      }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${base}/api/cockpit/sre/slo`);
      const json: any = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.configured).toBe(true);
      expect(json.targets.successRatePct).toBe(99.0);
      expect(json.compliance.latency).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
