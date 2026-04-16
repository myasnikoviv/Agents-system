import express from 'express';
import { AddressInfo } from 'net';
import { registerSecretsRoutes } from '../../server/routes/secretsRoutes';

describe('Secrets access control (AGSYS-3113)', () => {
  it('enforces RBAC and writes audit entries for secret mutations', async () => {
    const app = express();
    app.use(express.json({ limit: '1mb' }));

    const auditEntries: Array<{ action: string; actorId: string }> = [];
    const records = new Map<string, string>();
    const mk = (tenantId: string, workspaceId: string, userId: string, key: string) =>
      `${tenantId}:${workspaceId}:${userId}:${key}`;

    registerSecretsRoutes(app, {
      requireRole: (req, res, role = 'member') => {
        const token = String(req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim();
        if (!token) {
          res.status(401).json({ success: false, error: 'unauthorized' });
          return null;
        }
        const auth =
          token === 'admin-token'
            ? { userId: 'user-admin', tenantId: 'tenant-a', workspaceId: 'ws-a', role: 'admin' }
            : token === 'member-token'
              ? { userId: 'user-member', tenantId: 'tenant-a', workspaceId: 'ws-a', role: 'member' }
              : null;
        if (!auth) {
          res.status(401).json({ success: false, error: 'unauthorized' });
          return null;
        }
        const level = role === 'admin' ? 2 : 1;
        const current = auth.role === 'admin' ? 2 : 1;
        if (current < level) {
          res.status(403).json({ success: false, error: 'forbidden' });
          return null;
        }
        return auth;
      },
      secretsListMeta: async ({ tenantId, workspaceId, userId }) => {
        const prefix = `${tenantId}:${workspaceId}:${userId || ''}:`;
        return Array.from(records.keys())
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ key: k.split(':').slice(3).join(':'), tenantId, workspaceId, userId }));
      },
      secretsUpsert: async ({ tenantId, workspaceId, userId, key, value, createdBy }) => {
        records.set(mk(tenantId, workspaceId, String(userId || ''), key), value);
        return { key, tenantId, workspaceId, userId: String(userId || ''), createdBy };
      },
      secretsDelete: async ({ tenantId, workspaceId, userId, key }) =>
        records.delete(mk(tenantId, workspaceId, String(userId || ''), key)),
      secretsRotate: async ({ tenantId, workspaceId, userId, key, value, rotatedBy }) => {
        const id = mk(tenantId, workspaceId, String(userId || ''), key);
        if (!records.has(id)) return null;
        records.set(id, value);
        return {
          secret: { tenantId, workspaceId, userId: String(userId || ''), key, createdBy: rotatedBy },
          archivedVersion: 1,
        };
      },
      secretsListVersions: async ({ tenantId, workspaceId, userId, key }) =>
        records.has(mk(tenantId, workspaceId, String(userId || ''), key))
          ? [{ version: 1, tenantId, workspaceId, userId: String(userId || ''), key }]
          : [],
      appendControlActionAudit: (entry) => {
        auditEntries.push({ action: entry.action, actorId: entry.actorId });
      },
    });

    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${port}`;

    try {
      const denied = await fetch(`${base}/api/cockpit/secrets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer member-token' },
        body: JSON.stringify({ key: 'openhands.apiKeys.google', value: 'abc' }),
      });
      expect(denied.status).toBe(403);

      const upsert = await fetch(`${base}/api/cockpit/secrets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer admin-token' },
        body: JSON.stringify({ key: 'openhands.apiKeys.google', value: 'secret-value' }),
      });
      expect(upsert.status).toBe(200);

      const list = await fetch(`${base}/api/cockpit/secrets`, {
        headers: { authorization: 'Bearer admin-token' },
      });
      const listJson: any = await list.json();
      expect(list.status).toBe(200);
      expect(Array.isArray(listJson.items)).toBe(true);
      expect(listJson.items.length).toBe(1);

      const rotateOk = await fetch(`${base}/api/cockpit/secrets/openhands.apiKeys.google/rotate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer admin-token' },
        body: JSON.stringify({ value: 'next-secret' }),
      });
      expect(rotateOk.status).toBe(200);

      const versions = await fetch(`${base}/api/cockpit/secrets/openhands.apiKeys.google/versions`, {
        headers: { authorization: 'Bearer admin-token' },
      });
      const versionsJson: any = await versions.json();
      expect(versions.status).toBe(200);
      expect(Array.isArray(versionsJson.versions)).toBe(true);
      expect(versionsJson.versions.length).toBeGreaterThanOrEqual(1);

      const removed = await fetch(`${base}/api/cockpit/secrets/openhands.apiKeys.google`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' },
      });
      expect(removed.status).toBe(200);

      const rotated = await fetch(`${base}/api/cockpit/secrets/openhands.apiKeys.google/rotate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer admin-token' },
        body: JSON.stringify({ value: 'next-secret' }),
      });
      expect(rotated.status).toBe(404);

      expect(auditEntries.map((x) => x.action)).toEqual([
        'cockpit.secrets.upsert',
        'cockpit.secrets.rotate',
        'cockpit.secrets.delete',
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
