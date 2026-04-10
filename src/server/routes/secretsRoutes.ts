import type express from 'express';

interface SecretsRouteDeps {
  requireRole: (req: express.Request, res: express.Response, role?: string) => any;
  secretsListMeta: (input: { tenantId: string; workspaceId: string; userId?: string }) => Promise<any[]>;
  secretsUpsert: (input: {
    tenantId: string;
    workspaceId: string;
    userId?: string;
    key: string;
    value: string;
    createdBy: string;
  }) => Promise<any>;
  secretsDelete: (input: { tenantId: string; workspaceId: string; userId?: string; key: string }) => Promise<boolean>;
  secretsRotate: (input: {
    tenantId: string;
    workspaceId: string;
    userId?: string;
    key: string;
    value: string;
    rotatedBy?: string;
  }) => Promise<{ secret: any; archivedVersion: number } | null>;
  secretsListVersions: (input: { tenantId: string; workspaceId: string; userId?: string; key: string }) => Promise<any[]>;
  appendControlActionAudit: (entry: {
    action: string;
    actorId: string;
    target?: Record<string, any>;
    result?: Record<string, any>;
  }) => void;
}

export function registerSecretsRoutes(app: express.Express, deps: SecretsRouteDeps): void {
  app.get('/api/cockpit/secrets', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const items = await deps.secretsListMeta({ tenantId: auth.tenantId, workspaceId: auth.workspaceId, userId: auth.userId });
    res.json({ success: true, items });
  });

  app.post('/api/cockpit/secrets', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const key = String(req.body?.key || '').trim();
    const value = String(req.body?.value || '').trim();
    if (!key || !value) {
      return res.status(400).json({ success: false, error: 'key_and_value_required' });
    }
    const saved = await deps.secretsUpsert({
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      key,
      value,
      createdBy: auth.userId,
    });
    deps.appendControlActionAudit({
      action: 'cockpit.secrets.upsert',
      actorId: auth.userId,
      target: { key },
      result: { tenantId: auth.tenantId, workspaceId: auth.workspaceId },
    });
    res.json({ success: true, secret: saved });
  });

  app.delete('/api/cockpit/secrets/:key', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const key = String(req.params.key || '').trim();
    if (!key) {
      return res.status(400).json({ success: false, error: 'key_required' });
    }
    const deleted = await deps.secretsDelete({
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      key,
    });
    deps.appendControlActionAudit({
      action: 'cockpit.secrets.delete',
      actorId: auth.userId,
      target: { key },
      result: { deleted },
    });
    res.json({ success: true, deleted });
  });

  app.post('/api/cockpit/secrets/:key/rotate', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const key = String(req.params.key || '').trim();
    const value = String(req.body?.value || '').trim();
    if (!key || !value) {
      return res.status(400).json({ success: false, error: 'key_and_value_required' });
    }
    const rotated = await deps.secretsRotate({
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      key,
      value,
      rotatedBy: auth.userId,
    });
    if (!rotated) {
      return res.status(404).json({ success: false, error: 'secret_not_found' });
    }
    deps.appendControlActionAudit({
      action: 'cockpit.secrets.rotate',
      actorId: auth.userId,
      target: { key },
      result: { archivedVersion: rotated.archivedVersion },
    });
    res.json({ success: true, ...rotated });
  });

  app.get('/api/cockpit/secrets/:key/versions', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const key = String(req.params.key || '').trim();
    if (!key) {
      return res.status(400).json({ success: false, error: 'key_required' });
    }
    const versions = await deps.secretsListVersions({
      tenantId: auth.tenantId,
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      key,
    });
    res.json({ success: true, versions });
  });
}
