import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Restore endpoints (AGSYS-3126)', () => {
  it('returns restore status and executes restore run', async () => {
    const app = express();
    app.use(express.json());
    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => [],
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => row,
      getRestoreStatus: async () => ({ recent: [] }),
      runRestoreNow: async () => ({ checksumMatch: true }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const status = await fetch(`${base}/api/cockpit/restore/status`);
      const statusJson: any = await status.json();
      expect(status.status).toBe(200);
      expect(statusJson.success).toBe(true);

      const run = await fetch(`${base}/api/cockpit/restore/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const runJson: any = await run.json();
      expect(run.status).toBe(200);
      expect(runJson.success).toBe(true);
      expect(runJson.checksumMatch).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
