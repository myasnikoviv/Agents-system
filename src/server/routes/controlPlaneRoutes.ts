import type express from 'express';
import type { ControlPlaneRuntimeManager } from '../../runtime/control-plane/ControlPlaneRuntimeManager';
import { buildServiceStatusDashboardSnapshot } from '../../runtime/control-plane/ServiceStatusDashboardDataLayer';
import { LocalPlatformBootOrchestrator } from '../../runtime/control-plane/LocalPlatformBootOrchestrator';

interface ControlPlaneRouteDeps {
  requireRole: (
    req: express.Request,
    res: express.Response,
    role?: 'member' | 'admin',
  ) => { userId?: string; role?: string } | null;
  manager: ControlPlaneRuntimeManager;
  appendControlActionAudit?: (input: {
    action: string;
    projectId: string;
    actorId: string;
    result: Record<string, unknown>;
  }) => void;
}

export function registerControlPlaneRoutes(app: express.Express, deps: ControlPlaneRouteDeps): void {
  const bootOrchestrator = new LocalPlatformBootOrchestrator(deps.manager);
  const withMember = (req: express.Request, res: express.Response): boolean => !!deps.requireRole(req, res, 'member');
  const withAdmin = (req: express.Request, res: express.Response): boolean => !!deps.requireRole(req, res, 'admin');
  const readServices = (_req: express.Request, res: express.Response): void => {
    const serviceIds = deps.manager.listServices();
    const items = serviceIds.map((serviceId) => deps.manager.getStatus(serviceId));
    res.json({ success: true, items });
  };

  const readServiceStatus = (req: express.Request, res: express.Response): void => {
    const serviceId = String(req.params?.serviceId || '').trim();
    if (!serviceId) {
      res.status(400).json({ success: false, error: 'service_id_required' });
      return;
    }
    try {
      const item = deps.manager.getStatus(serviceId);
      res.json({ success: true, item });
    } catch (error: any) {
      res.status(404).json({ success: false, error: 'service_not_found', message: error?.message || 'Service not found' });
    }
  };

  app.get('/api/cockpit/control-plane/services/:serviceId/status', (req, res) => {
    if (!withMember(req, res)) return;
    readServiceStatus(req, res);
  });

  app.get('/api/cockpit/control-plane/services', (req, res) => {
    if (!withMember(req, res)) return;
    readServices(req, res);
  });

  app.post('/api/cockpit/control-plane/services/:serviceId/start', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const serviceId = String(req.params?.serviceId || '').trim();
    if (!serviceId) {
      res.status(400).json({ success: false, error: 'service_id_required' });
      return;
    }
    try {
      const item = await deps.manager.start(serviceId, { actorId: auth.userId || null, source: 'api' });
      deps.appendControlActionAudit?.({
        action: 'control_plane_service_start',
        projectId: 'control-plane',
        actorId: String(auth.userId || 'unknown'),
        result: { serviceId, ok: true },
      });
      res.json({ success: true, action: 'start', item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: 'service_start_failed', message: error?.message || 'Failed to start service' });
    }
  });

  app.post('/api/cockpit/control-plane/services/:serviceId/stop', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const serviceId = String(req.params?.serviceId || '').trim();
    if (!serviceId) {
      res.status(400).json({ success: false, error: 'service_id_required' });
      return;
    }
    try {
      const item = await deps.manager.stop(serviceId, { actorId: auth.userId || null, source: 'api' });
      deps.appendControlActionAudit?.({
        action: 'control_plane_service_stop',
        projectId: 'control-plane',
        actorId: String(auth.userId || 'unknown'),
        result: { serviceId, ok: true },
      });
      res.json({ success: true, action: 'stop', item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: 'service_stop_failed', message: error?.message || 'Failed to stop service' });
    }
  });

  app.post('/api/cockpit/control-plane/services/:serviceId/restart', async (req, res) => {
    const auth = deps.requireRole(req, res, 'admin');
    if (!auth) return;
    const serviceId = String(req.params?.serviceId || '').trim();
    if (!serviceId) {
      res.status(400).json({ success: false, error: 'service_id_required' });
      return;
    }
    try {
      const item = await deps.manager.restart(serviceId, { actorId: auth.userId || null, source: 'api' });
      deps.appendControlActionAudit?.({
        action: 'control_plane_service_restart',
        projectId: 'control-plane',
        actorId: String(auth.userId || 'unknown'),
        result: { serviceId, ok: true },
      });
      res.json({ success: true, action: 'restart', item });
    } catch (error: any) {
      res.status(400).json({ success: false, error: 'service_restart_failed', message: error?.message || 'Failed to restart service' });
    }
  });

  // Gateway facade endpoints reuse the same control-plane routing handlers.
  app.get('/api/cockpit/gateway/control-plane/services', (req, res) => {
    if (!withMember(req, res)) return;
    readServices(req, res);
  });
  app.get('/api/cockpit/gateway/control-plane/services/:serviceId/status', (req, res) => {
    if (!withMember(req, res)) return;
    readServiceStatus(req, res);
  });
  app.get('/api/cockpit/gateway/control-plane/health', (req, res) => {
    if (!withMember(req, res)) return;
    const serviceIds = deps.manager.listServices();
    const items = serviceIds.map((serviceId) => deps.manager.getStatus(serviceId));
    res.json({
      success: true,
      healthy: items.filter((x) => String((x.state as any)?.status || '') === 'running').length,
      total: items.length,
      items,
    });
  });
  app.get('/api/cockpit/control-plane/events', (req, res) => {
    if (!withMember(req, res)) return;
    res.json({ success: true, items: deps.manager.listLifecycleEvents() });
  });
  app.get('/api/cockpit/control-plane/dashboard-data', (req, res) => {
    if (!withMember(req, res)) return;
    res.json({ success: true, snapshot: buildServiceStatusDashboardSnapshot(deps.manager) });
  });
  app.post('/api/cockpit/control-plane/boot/start', async (req, res) => {
    if (!withAdmin(req, res)) return;
    try {
      const result = await bootOrchestrator.bootAll();
      res.json({ success: result.success, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'control_plane_boot_failed', message: error?.message || 'Boot failed' });
    }
  });
}
