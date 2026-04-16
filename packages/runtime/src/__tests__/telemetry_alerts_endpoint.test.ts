import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Alerts endpoint (AGSYS-3122)', () => {
  it('returns failure/quota/infra alerts snapshot', async () => {
    const app = express();
    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => [],
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => row,
      getAlertsSnapshot: async () => ({
        alerts: [
          { code: 'failures_alert', status: 'firing' },
          { code: 'quota_alert', status: 'firing' },
          { code: 'infra_alert', status: 'firing' },
        ],
        channels: ['in_app', 'audit_log'],
      }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${base}/api/cockpit/alerts`);
      const json: any = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.configured).toBe(true);
      expect(json.alerts.length).toBe(3);
      expect(json.channels).toContain('in_app');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
