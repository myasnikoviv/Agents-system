import type express from 'express';

type UnifiedTelemetryEvent = {
  id: string;
  timestamp: number;
  isoTime: string;
  source: 'runtime' | 'audit';
  category: 'run' | 'agent' | 'tool' | 'guard' | 'governance' | 'worker' | 'queue' | 'control' | 'billing' | 'other';
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
  verifyAuditIntegrity?: () => Promise<{ ok: boolean; checked: number; brokenAtId?: string; reason?: string }>;
  getMetricsOverview?: (input: { projectId?: string; limit?: number }) => Promise<{
    runtime: Record<string, any>;
    api: Record<string, any>;
    billing: Record<string, any>;
    generatedAt: string;
  }>;
  listApiTraceSpans?: (input: { traceId?: string; runId?: string; limit?: number }) => Promise<Array<Record<string, any>>>;
  readRunLedgerEvents: (input: { runId?: string; projectId?: string; limit?: number }) => Promise<any[]>;
  normalizeRuntimeEvent: (row: any) => UnifiedTelemetryEvent;
}

export function registerTelemetryRoutes(app: express.Express, deps: TelemetryRouteDeps): void {
  const parseNumber = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const normalizeText = (value: unknown): string => String(value || '').trim().toLowerCase();
  const matchesAuditFilters = (
    row: UnifiedTelemetryEvent,
    input: {
      action?: string;
      actorId?: string;
      category?: string;
      q?: string;
      fromTs?: number | null;
      toTs?: number | null;
    },
  ): boolean => {
    const action = normalizeText(input.action);
    const actorId = normalizeText(input.actorId);
    const category = normalizeText(input.category);
    const q = normalizeText(input.q);
    const fromTs = input.fromTs;
    const toTs = input.toTs;

    if (action && !normalizeText(row.type).includes(action)) return false;
    if (actorId && normalizeText(row.actorId).indexOf(actorId) < 0) return false;
    if (category && normalizeText(row.category) !== category) return false;
    if (typeof fromTs === 'number' && row.timestamp < fromTs) return false;
    if (typeof toTs === 'number' && row.timestamp > toTs) return false;
    if (q) {
      const blob = normalizeText(
        JSON.stringify({
          type: row.type,
          actorId: row.actorId,
          payload: row.payload,
          projectId: row.projectId,
          runId: row.runId,
          chainId: row.chainId,
        }),
      );
      if (!blob.includes(q)) return false;
    }
    return true;
  };

  const readControlActions = async (req: express.Request, res: express.Response) => {
    try {
      const projectId = String(req.query?.projectId || '').trim();
      const limit = Math.max(1, Math.min(500, Number(req.query?.limit || 100)));
      const action = String(req.query?.action || '').trim();
      const actorId = String(req.query?.actorId || '').trim();
      const category = String(req.query?.category || '').trim();
      const q = String(req.query?.q || '').trim();
      const fromTs = parseNumber(req.query?.fromTs);
      const toTs = parseNumber(req.query?.toTs);
      const rows = await deps.readControlActionAuditRows(projectId || undefined);
      const events = rows.map(deps.normalizeAuditRow).filter((row) =>
        matchesAuditFilters(row, { action, actorId, category, q, fromTs, toTs }),
      );
      const sliced = events.slice(-limit).reverse();
      res.json({ success: true, actions: sliced, total: rows.length, limit });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'control_actions_fetch_failed',
        message: error?.message || 'Failed to read control action audit',
      });
    }
  };

  app.get('/api/cockpit/control-actions', async (req, res) => {
    await readControlActions(req, res);
  });

  app.get('/api/system/control-actions', async (req, res) => {
    await readControlActions(req, res);
  });

  app.get('/api/cockpit/audit/logs', async (req, res) => {
    try {
      const projectId = String(req.query?.projectId || '').trim();
      const limit = Math.max(1, Math.min(1000, Number(req.query?.limit || 200)));
      const action = String(req.query?.action || '').trim();
      const actorId = String(req.query?.actorId || '').trim();
      const category = String(req.query?.category || '').trim();
      const q = String(req.query?.q || '').trim();
      const fromTs = parseNumber(req.query?.fromTs);
      const toTs = parseNumber(req.query?.toTs);
      const rows = await deps.readControlActionAuditRows(projectId || undefined);
      const events = rows
        .map(deps.normalizeAuditRow)
        .filter((row) => matchesAuditFilters(row, { action, actorId, category, q, fromTs, toTs }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
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

  app.get('/api/cockpit/audit/integrity', async (_req, res) => {
    try {
      if (!deps.verifyAuditIntegrity) {
        return res.json({
          success: true,
          ok: false,
          checked: 0,
          reason: 'integrity_verifier_not_configured',
        });
      }
      const result = await deps.verifyAuditIntegrity();
      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'audit_integrity_check_failed',
        message: error?.message || 'Failed to verify audit integrity',
      });
    }
  });

  app.get('/api/cockpit/metrics/overview', async (req, res) => {
    try {
      if (!deps.getMetricsOverview) {
        return res.json({
          success: true,
          runtime: {},
          api: {},
          billing: {},
          generatedAt: new Date().toISOString(),
          source: 'metrics_overview_not_configured',
        });
      }
      const projectId = String(req.query?.projectId || '').trim() || undefined;
      const limit = Math.max(1, Math.min(1000, Number(req.query?.limit || 200)));
      const overview = await deps.getMetricsOverview({ projectId, limit });
      return res.json({
        success: true,
        ...overview,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'metrics_overview_fetch_failed',
        message: error?.message || 'Failed to build metrics overview',
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

  app.get('/api/cockpit/telemetry/traces', async (req, res) => {
    try {
      const traceId = String(req.query?.traceId || '').trim() || undefined;
      const runId = String(req.query?.runId || '').trim() || undefined;
      const limit = Math.max(1, Math.min(5000, Number(req.query?.limit || 500)));
      const apiSpans = deps.listApiTraceSpans
        ? await deps.listApiTraceSpans({ traceId, runId, limit })
        : [];
      const runtimeEvents = runId
        ? (await deps.readRunLedgerEvents({ runId, limit })).map(deps.normalizeRuntimeEvent)
        : [];
      res.json({
        success: true,
        query: { traceId: traceId || null, runId: runId || null, limit },
        apiSpans,
        runtimeEvents,
        counts: {
          apiSpans: apiSpans.length,
          runtimeEvents: runtimeEvents.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'trace_fetch_failed',
        message: error?.message || 'Failed to fetch trace data',
      });
    }
  });
}
