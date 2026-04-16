import express from 'express';
import { AddressInfo } from 'net';
import { registerTelemetryRoutes } from '../../server/routes/telemetryRoutes';

describe('Telemetry audit search (AGSYS-3116)', () => {
  it('filters audit logs by action/category/actor/query and time range', async () => {
    const app = express();
    const auditRows = [
      {
        id: 'a-1',
        timestamp: new Date('2026-04-10T12:00:00Z').toISOString(),
        action: 'cockpit.secrets.upsert',
        projectId: 'proj-a',
        actorId: 'user-1',
        target: { key: 'k1' },
        result: { ok: true },
      },
      {
        id: 'a-2',
        timestamp: new Date('2026-04-10T12:10:00Z').toISOString(),
        action: 'billing.subscription.updated',
        projectId: 'proj-a',
        actorId: 'billing-bot',
        target: { plan: 'pro' },
        result: { ok: true },
      },
    ];

    registerTelemetryRoutes(app, {
      fetchRecentEvents: async () => [],
      readControlActionAuditRows: async () => auditRows,
      verifyAuditIntegrity: async () => ({ ok: true, checked: 2 }),
      readRunLedgerEvents: async () => [],
      normalizeRuntimeEvent: (row: any) => row,
      normalizeAuditRow: (row: any) => ({
        id: row.id,
        timestamp: new Date(row.timestamp).getTime(),
        isoTime: String(row.timestamp),
        source: 'audit' as const,
        category: String(row.action || '').startsWith('billing.') ? ('billing' as const) : ('control' as const),
        type: String(row.action),
        projectId: row.projectId,
        actorId: row.actorId,
        payload: { target: row.target, result: row.result },
      }),
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;

    try {
      const byAction = await fetch(`${base}/api/cockpit/audit/logs?action=secrets.upsert`);
      const byActionJson: any = await byAction.json();
      expect(byAction.status).toBe(200);
      expect(byActionJson.count).toBe(1);
      expect(byActionJson.events[0]?.type).toBe('cockpit.secrets.upsert');

      const byCategory = await fetch(`${base}/api/cockpit/audit/logs?category=billing`);
      const byCategoryJson: any = await byCategory.json();
      expect(byCategory.status).toBe(200);
      expect(byCategoryJson.count).toBe(1);
      expect(byCategoryJson.events[0]?.category).toBe('billing');

      const byActorAndQuery = await fetch(
        `${base}/api/cockpit/audit/logs?actorId=billing-bot&q=subscription`,
      );
      const byActorAndQueryJson: any = await byActorAndQuery.json();
      expect(byActorAndQuery.status).toBe(200);
      expect(byActorAndQueryJson.count).toBe(1);
      expect(byActorAndQueryJson.events[0]?.actorId).toBe('billing-bot');

      const byTime = await fetch(
        `${base}/api/cockpit/audit/logs?fromTs=${Date.parse('2026-04-10T12:05:00Z')}`,
      );
      const byTimeJson: any = await byTime.json();
      expect(byTime.status).toBe(200);
      expect(byTimeJson.count).toBe(1);
      expect(byTimeJson.events[0]?.type).toBe('billing.subscription.updated');

      const integrity = await fetch(`${base}/api/cockpit/audit/integrity`);
      const integrityJson: any = await integrity.json();
      expect(integrity.status).toBe(200);
      expect(integrityJson.ok).toBe(true);
      expect(integrityJson.checked).toBe(2);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
