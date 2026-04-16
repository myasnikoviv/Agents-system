import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Data classification endpoint (AGSYS-3127)', () => {
  it('returns pii/sensitive/policies sections', async () => {
    const app = express();
    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => [],
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => row,
      getDataClassification: async () => ({
        pii: [{ field: 'user.email' }],
        sensitive: [{ field: 'runtime.audit' }],
        policies: [{ id: 'policy.data.access' }],
      }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const response = await fetch(`${base}/api/cockpit/compliance/data-classification`);
      const json: any = await response.json();
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.configured).toBe(true);
      expect(Array.isArray(json.pii)).toBe(true);
      expect(Array.isArray(json.sensitive)).toBe(true);
      expect(Array.isArray(json.policies)).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
