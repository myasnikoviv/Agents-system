import type express from 'express';

interface SecretsRouteDeps {
  requireRole: (req: express.Request, res: express.Response, role?: 'member' | 'admin') => any;
  secretsListMeta: (input: { tenantId: string; workspaceId: string }) => Promise<any[]>;
  secretsUpsert: (input: {
    tenantId: string;
    workspaceId: string;
    key: string;
    value: string;
    createdBy: string;
  }) => Promise<any>;
  secretsDelete: (input: { tenantId: string; workspaceId: string; key: string }) => Promise<boolean>;
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
    const items = await deps.secretsListMeta({ tenantId: auth.tenantId, workspaceId: auth.workspaceId });
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
}
