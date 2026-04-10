import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Backup endpoints (AGSYS-3125)', () => {
  it('returns backup status and executes full/incremental backup runs', async () => {
    const app = express();
    app.use(express.json());
    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => [],
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => row,
      getBackupStatus: async () => ({
        schedule: { fullCron: 'daily@02:00', incrementalCron: 'hourly' },
        recent: [],
      }),
      runBackupNow: async ({ mode }) => ({
        mode,
        verified: true,
      }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;
    try {
      const statusRes = await fetch(`${base}/api/cockpit/backup/status`);
      const statusJson: any = await statusRes.json();
      expect(statusRes.status).toBe(200);
      expect(statusJson.success).toBe(true);
      expect(statusJson.schedule.fullCron).toBe('daily@02:00');

      const runFullRes = await fetch(`${base}/api/cockpit/backup/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      });
      const runFullJson: any = await runFullRes.json();
      expect(runFullRes.status).toBe(200);
      expect(runFullJson.mode).toBe('full');
      expect(runFullJson.verified).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
