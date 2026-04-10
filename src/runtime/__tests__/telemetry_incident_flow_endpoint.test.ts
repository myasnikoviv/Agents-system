import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Incident flow endpoint (AGSYS-3124)', () => {
  it('returns detection/escalation/resolution flow', async () => {
    const app = express();
    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => [],
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => row,
      getIncidentFlow: async () => ({
        stages: [{ id: 'detection' }, { id: 'escalation' }, { id: 'resolution' }],
      }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${base}/api/cockpit/incidents/flow`);
      const json: any = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.configured).toBe(true);
      expect(json.stages.map((s: any) => s.id)).toEqual(['detection', 'escalation', 'resolution']);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
