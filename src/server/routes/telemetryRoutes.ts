import type express from 'express';

type UnifiedTelemetryEvent = {
  id: string;
  timestamp: number;
  isoTime: string;
  source: 'runtime' | 'audit';
  category: 'run' | 'agent' | 'tool' | 'guard' | 'governance' | 'worker' | 'queue' | 'control' | 'other';
  type: string;
  runId?: string;
  projectId?: string;
  chainId?: string;
  actorId?: string;
  actorType?: string;
  payload: Record<string, any>;
};

interface TelemetryRouteDeps {
  fetchRecentEvents: (count?: number) => Promise<any[]>;
  readControlActionAuditRows: (projectId?: string) => Promise<any[]>;
  normalizeAuditRow: (row: any) => UnifiedTelemetryEvent;
  readRunLedgerEvents: (input: { runId?: string; projectId?: string; limit?: number }) => Promise<any[]>;
  normalizeRuntimeEvent: (row: any) => UnifiedTelemetryEvent;
}

export function registerTelemetryRoutes(app: express.Express, deps: TelemetryRouteDeps): void {
  app.get('/api/cockpit/control-actions', async (req, res) => {
    try {
      const projectId = String(req.query?.projectId || '').trim();
      const limit = Math.max(1, Math.min(500, Number(req.query?.limit || 100)));
      const rows = await deps.readControlActionAuditRows(projectId || undefined);
      const sliced = rows.slice(-limit).reverse();
      res.json({ success: true, actions: sliced, total: rows.length, limit });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'control_actions_fetch_failed',
        message: error?.message || 'Failed to read control action audit',
      });
    }
  });

  app.get('/api/cockpit/audit/logs', async (req, res) => {
    try {
      const projectId = String(req.query?.projectId || '').trim();
      const limit = Math.max(1, Math.min(1000, Number(req.query?.limit || 200)));
      const rows = await deps.readControlActionAuditRows(projectId || undefined);
      const events = rows.slice(-limit).map(deps.normalizeAuditRow).sort((a, b) => b.timestamp - a.timestamp);
      res.json({
        success: true,
        source: 'control-actions.jsonl',
        projectId: projectId || null,
        total: rows.length,
        count: events.length,
        events,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'audit_logs_fetch_failed',
        message: error?.message || 'Failed to read audit logs',
      });
    }
  });

  app.get('/api/cockpit/telemetry/unified', async (req, res) => {
    try {
      const projectId = String(req.query?.projectId || '').trim();
      const runId = String(req.query?.runId || '').trim();
      const limit = Math.max(1, Math.min(1000, Number(req.query?.limit || 200)));
      const runtimeEvents = runId
        ? await deps.readRunLedgerEvents({ runId, projectId: projectId || undefined, limit })
        : await deps.fetchRecentEvents(limit);
      const normalizedRuntime = runtimeEvents
        .filter((row: any) => (projectId ? String(row?.projectId || '') === projectId : true))
        .map(deps.normalizeRuntimeEvent);
      const normalizedAudit = (await deps.readControlActionAuditRows(projectId || undefined)).slice(-limit).map(deps.normalizeAuditRow);
      const merged = [...normalizedRuntime, ...normalizedAudit]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      const summary = merged.reduce(
        (acc, row) => {
          acc.total += 1;
          acc.bySource[row.source] = (acc.bySource[row.source] || 0) + 1;
          acc.byCategory[row.category] = (acc.byCategory[row.category] || 0) + 1;
          if (row.runId) acc.runIds.add(row.runId);
          return acc;
        },
        {
          total: 0,
          bySource: {} as Record<string, number>,
          byCategory: {} as Record<string, number>,
          runIds: new Set<string>(),
        },
      );

      res.json({
        success: true,
        projectId: projectId || null,
        runId: runId || null,
        events: merged,
        summary: {
          total: summary.total,
          bySource: summary.bySource,
          byCategory: summary.byCategory,
          uniqueRuns: summary.runIds.size,
        },
        serverNow: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'unified_telemetry_fetch_failed',
        message: error?.message || 'Failed to build unified telemetry feed',
      });
    }
  });

  app.get('/api/cockpit/telemetry/runs/:runId/trace', async (req, res) => {
    try {
      const runId = String(req.params.runId || '').trim();
      if (!runId) return res.status(400).json({ success: false, error: 'run_id_required' });
      const events = (await deps.readRunLedgerEvents({ runId, limit: 5000 })).map(deps.normalizeRuntimeEvent);
      const stages = events.filter((e) => e.type === 'agent.started' || e.type === 'agent.completed' || e.type === 'swarm.handoff');
      const tools = events.filter((e) => e.type === 'tool.call' || e.type === 'tool.result');
      const guards = events.filter((e) => e.type.startsWith('guard.') || e.type === 'governance.rule_check');
      const startedAt = events.length > 0 ? events.reduce((m, e) => Math.min(m, e.timestamp), Number.MAX_SAFE_INTEGER) : null;
      const finishedAt = events.length > 0 ? events.reduce((m, e) => Math.max(m, e.timestamp), 0) : null;
      res.json({
        success: true,
        runId,
        trace: {
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          finishedAt: finishedAt ? new Date(finishedAt).toISOString() : null,
          durationMs: startedAt && finishedAt ? finishedAt - startedAt : 0,
          eventsTotal: events.length,
          stages,
          tools,
          guards,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'run_trace_fetch_failed',
        message: error?.message || 'Failed to build run trace',
      });
    }
  });
}
