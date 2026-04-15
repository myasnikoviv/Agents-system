import { useEffect, useMemo, useState, type FC } from 'react';
import type { RuntimeEvent } from './StreamRenderer';
import { fetchJsonSafe } from '../../lib/http';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

interface ObservabilityPanelsProps {
  events: RuntimeEvent[];
  selectedProject?: string;
}

interface CostBreakdownApi {
  success?: boolean;
  breakdown?: {
    perRun?: Array<{
      runId: string;
      projectId: string;
      workspaceId: string;
      totalCostUsd: number;
      tokens: number;
      toolExecutions: number;
      runtimeSeconds: number;
    }>;
    perAgent?: Record<string, number>;
    perWorkspace?: Record<string, number>;
  };
}

const eventTypeOf = (event: RuntimeEvent): string => {
  return String(event.event_type || event.type || '').trim();
};

const tsOf = (event: RuntimeEvent): number => {
  const raw = event.timestamp;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : Date.now();
};

export const ObservabilityPanels: FC<ObservabilityPanelsProps> = ({ events, selectedProject }) => {
  const [debugOpen, setDebugOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState('');
  const [costApiData, setCostApiData] = useState<CostBreakdownApi['breakdown'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadBreakdown = async () => {
      setCostLoading(true);
      setCostError('');
      const projectId = String(selectedProject || '').trim();
      const query = projectId ? `?projectId=${encodeURIComponent(projectId)}&limit=50` : '?limit=50';
      const result = await fetchJsonSafe<CostBreakdownApi>(`/api/system/billing/cost/breakdown${query}`);
      if (cancelled) return;
      if (!result?.success || !result.breakdown) {
        setCostApiData(null);
        setCostError('Cost breakdown data is not available yet.');
        setCostLoading(false);
        return;
      }
      setCostApiData(result.breakdown);
      setCostLoading(false);
    };
    void loadBreakdown();
    return () => {
      cancelled = true;
    };
  }, [selectedProject, events.length]);

  const governanceRows = useMemo(() => {
    return events
      .filter((e) => eventTypeOf(e) === 'governance.rule_check')
      .map((e) => ({
        id: e.id || e.event_id || `${tsOf(e)}:${Math.random()}`,
        rule: String(e.payload?.rule || 'unknown').trim(),
        status: String(e.payload?.status || 'unknown').trim().toUpperCase(),
        action: String(e.payload?.action || 'none').trim(),
        detail: String(e.payload?.detail || '').trim(),
      }));
  }, [events]);

  const loopStats = useMemo(() => {
    const retry = events.filter((e) => eventTypeOf(e) === 'guard.retry').length;
    const verify = governanceRows.filter((r) => r.rule.includes('postflight') || r.rule.includes('required_pipeline_usage')).length;
    const improve = governanceRows.filter((r) => r.rule.includes('improvement') || r.rule.includes('learning')).length;
    return { retry, verify, improve };
  }, [events, governanceRows]);

  const loopRows = useMemo(() => {
    type LoopRow = {
      key: string;
      loopType: 'retry' | 'verification' | 'improvement';
      iterationCount: number;
      result: 'pass' | 'fail' | 'running' | 'unknown';
      latestAt: number;
    };

    const rows = new Map<string, LoopRow>();

    for (const event of events) {
      const type = eventTypeOf(event);
      const at = tsOf(event);

      if (type === 'guard.retry') {
        const stepId = String(event.payload?.stepId || event.payload?.stageId || event.payload?.rule || 'retry-loop').trim();
        const key = `retry:${stepId}`;
        const attemptRaw = Number(event.payload?.attempt ?? event.payload?.iteration ?? 0);
        const attempt = Number.isFinite(attemptRaw) && attemptRaw > 0 ? attemptRaw : 1;
        const existing = rows.get(key);
        rows.set(key, {
          key,
          loopType: 'retry',
          iterationCount: Math.max(existing?.iterationCount || 0, attempt),
          result: existing?.result || 'running',
          latestAt: Math.max(existing?.latestAt || 0, at),
        });
        continue;
      }

      if (type === 'governance.rule_check') {
        const rule = String(event.payload?.rule || 'rule').trim();
        const statusRaw = String(event.payload?.status || event.payload?.outcome || '').trim().toLowerCase();
        const result: LoopRow['result'] =
          statusRaw === 'pass' || statusRaw === 'passed' || statusRaw === 'ok'
            ? 'pass'
            : statusRaw === 'fail' || statusRaw === 'failed' || statusRaw === 'blocked'
              ? 'fail'
              : 'unknown';

        if (rule.includes('improvement') || rule.includes('learning')) {
          const key = `improvement:${rule}`;
          const existing = rows.get(key);
          rows.set(key, {
            key,
            loopType: 'improvement',
            iterationCount: (existing?.iterationCount || 0) + 1,
            result,
            latestAt: Math.max(existing?.latestAt || 0, at),
          });
          continue;
        }

        if (rule.includes('postflight') || rule.includes('required_pipeline_usage') || rule.includes('verification')) {
          const key = `verification:${rule}`;
          const existing = rows.get(key);
          rows.set(key, {
            key,
            loopType: 'verification',
            iterationCount: (existing?.iterationCount || 0) + 1,
            result,
            latestAt: Math.max(existing?.latestAt || 0, at),
          });
        }
      }
    }

    return Array.from(rows.values())
      .sort((a, b) => b.latestAt - a.latestAt)
      .slice(0, 30);
  }, [events]);

  const enforcementRows = useMemo(() => {
    return events
      .filter((e) => {
        const t = eventTypeOf(e);
        return t === 'guard.block' || t === 'guard.retry' || t === 'guard.escalate' || t === 'guard.triggered';
      })
      .map((e) => ({
        id: String(e.id || e.event_id || `${tsOf(e)}-${Math.random()}`),
        at: tsOf(e),
        type: eventTypeOf(e),
        rule: String(e.payload?.rule || e.payload?.ruleId || 'n/a').trim(),
        reason: String(e.payload?.reason || e.payload?.detail || e.payload?.message || '').trim(),
        action: String(e.payload?.action || e.payload?.status || '').trim(),
      }));
  }, [events]);

  const planSummary = useMemo(() => {
    const stageStarted = events.filter((e) => eventTypeOf(e) === 'agent.started' || eventTypeOf(e) === 'stage.started');
    const agents = Array.from(
      new Set(stageStarted.map((e) => String(e.actor?.id || e.actor?.role || e.agent_role || '').trim()).filter(Boolean)),
    );
    const pipelines = Array.from(
      new Set(events.map((e) => String(e.payload?.pipelineId || '').trim()).filter(Boolean)),
    );
    const tools = Array.from(
      new Set(events.filter((e) => eventTypeOf(e) === 'tool.call' || eventTypeOf(e) === 'tool.called').map((e) => String(e.payload?.tool || '').trim()).filter(Boolean)),
    );
    return { agents, pipelines, tools };
  }, [events]);

  const planDiff = useMemo(() => {
    const collectPlannedStages = (plan: any): string[] => {
      if (!plan || typeof plan !== 'object') return [];
      const fromStages = Array.isArray(plan.stages)
        ? plan.stages.map((s: any) => String(s?.id || s?.stageId || s?.name || '').trim())
        : [];
      const fromSteps = Array.isArray(plan.steps)
        ? plan.steps.map((s: any) => String(s?.id || s?.stageId || s?.name || '').trim())
        : [];
      const fromPipelines = Array.isArray(plan.pipelines)
        ? plan.pipelines.flatMap((p: any) =>
            Array.isArray(p?.stages)
              ? p.stages.map((s: any) => String(s?.id || s?.stageId || s?.name || '').trim())
              : [],
          )
        : [];
      return [...fromStages, ...fromSteps, ...fromPipelines].filter(Boolean);
    };

    const plannedAgents = new Set(
      events
        .filter((e) => eventTypeOf(e) === 'run.started')
        .flatMap((e) => {
          const raw = e.payload?.plan?.agents;
          return Array.isArray(raw) ? raw : [];
        })
        .map((v) => String(v || '').trim())
        .filter(Boolean),
    );
    const plannedStages = new Set(
      events
        .filter((e) => eventTypeOf(e) === 'run.started')
        .flatMap((e) => collectPlannedStages(e.payload?.plan))
        .map((v) => String(v || '').trim())
        .filter(Boolean),
    );
    const executedAgents = new Set(
      events
        .filter((e) => eventTypeOf(e) === 'agent.started' || eventTypeOf(e) === 'stage.started')
        .map((e) => String(e.payload?.agentSlug || e.actor?.id || e.actor?.role || e.agent_role || '').trim())
        .filter(Boolean),
    );
    const executedStages = new Set(
      events
        .filter((e) => {
          const t = eventTypeOf(e);
          return t === 'stage.started' || t === 'swarm_stage_completed' || t === 'agent.started';
        })
        .map((e) => String(e.payload?.stageId || e.payload?.stageTitle || e.source_stage || '').trim())
        .filter(Boolean),
    );

    const missingAgents = Array.from(plannedAgents).filter((a) => !executedAgents.has(a));
    const extraAgents = Array.from(executedAgents).filter((a) => plannedAgents.size > 0 && !plannedAgents.has(a));
    const missingSteps = Array.from(plannedStages).filter((s) => !executedStages.has(s));
    const extraSteps = Array.from(executedStages).filter((s) => plannedStages.size > 0 && !plannedStages.has(s));
    const mismatch = missingAgents.length > 0 || extraAgents.length > 0 || missingSteps.length > 0 || extraSteps.length > 0;
    return { plannedAgents, executedAgents, plannedStages, executedStages, missingAgents, extraAgents, missingSteps, extraSteps, mismatch };
  }, [events]);

  const latestPlan = useMemo(() => {
    const runStarted = [...events]
      .filter((e) => eventTypeOf(e) === 'run.started')
      .sort((a, b) => tsOf(b) - tsOf(a))[0];
    const plan = runStarted?.payload?.plan;
    if (!plan || typeof plan !== 'object') return null;
    return plan as Record<string, unknown>;
  }, [events]);

  const toolRows = useMemo(() => {
    const calls = events.filter((e) => eventTypeOf(e) === 'tool.call' || eventTypeOf(e) === 'tool.called');
    return calls.map((e) => ({
      at: tsOf(e),
      agent: String(e.actor?.id || e.actor?.role || 'unknown').trim(),
      tool: String(e.payload?.tool || 'unknown').trim(),
      summary: String(e.payload?.summary || '').trim(),
      durationMs: Number(e.payload?.durationMs ?? e.payload?.duration ?? -1),
    }));
  }, [events]);

  const toolUsageSummary = useMemo(() => {
    const byTool: Record<string, { count: number; totalDurationMs: number }> = {};
    const byAgent: Record<string, { count: number; totalDurationMs: number }> = {};
    for (const row of toolRows) {
      if (!byTool[row.tool]) byTool[row.tool] = { count: 0, totalDurationMs: 0 };
      if (!byAgent[row.agent]) byAgent[row.agent] = { count: 0, totalDurationMs: 0 };
      byTool[row.tool].count += 1;
      byAgent[row.agent].count += 1;
      if (Number.isFinite(row.durationMs) && row.durationMs > 0) {
        byTool[row.tool].totalDurationMs += row.durationMs;
        byAgent[row.agent].totalDurationMs += row.durationMs;
      }
    }
    const topTool = Object.entries(byTool).sort((a, b) => b[1].count - a[1].count)[0] || null;
    const topAgent = Object.entries(byAgent).sort((a, b) => b[1].count - a[1].count)[0] || null;
    return { byTool, byAgent, topTool, topAgent };
  }, [toolRows]);

  const costSummary = useMemo(() => {
    const llmReq = events.filter((e) => eventTypeOf(e) === 'llm.request').length;
    const llmRes = events.filter((e) => eventTypeOf(e) === 'llm.response').length;
    const promptChars = events
      .filter((e) => eventTypeOf(e) === 'llm.request')
      .reduce((acc, e) => acc + String(e.payload?.prompt || '').length, 0);
    const outputChars = events
      .filter((e) => eventTypeOf(e) === 'llm.response')
      .reduce((acc, e) => acc + String(e.payload?.response || e.payload?.content || '').length, 0);
    return { llmReq, llmRes, promptChars, outputChars };
  }, [events]);

  const tokenBreakdown = useMemo(() => {
    const perRun: Record<string, number> = {};
    const perAgent: Record<string, number> = {};
    const perStep: Record<string, number> = {};
    let totalTokens = 0;

    for (const e of events) {
      if (eventTypeOf(e) !== 'llm.response') continue;
      const input = Number(e.payload?.tokensInput ?? e.payload?.inputTokens ?? 0);
      const output = Number(e.payload?.tokensOutput ?? e.payload?.outputTokens ?? 0);
      const tokens = (Number.isFinite(input) ? input : 0) + (Number.isFinite(output) ? output : 0);
      if (tokens <= 0) continue;

      const runId = String(e.runId || e.pipeline_run_id || 'run:n/a').trim() || 'run:n/a';
      const agent = String(e.payload?.agentSlug || e.actor?.id || e.actor?.role || e.agent_role || 'agent:n/a').trim() || 'agent:n/a';
      const step = String(e.payload?.stageId || e.payload?.stepId || e.source_stage || 'step:n/a').trim() || 'step:n/a';

      perRun[runId] = (perRun[runId] || 0) + tokens;
      perAgent[agent] = (perAgent[agent] || 0) + tokens;
      perStep[step] = (perStep[step] || 0) + tokens;
      totalTokens += tokens;
    }

    const top = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return {
      totalTokens,
      perRunTop: top(perRun),
      perAgentTop: top(perAgent),
      perStepTop: top(perStep),
    };
  }, [events]);

  const costBreakdown = useMemo(() => {
    const tokensByAgent: Record<string, number> = {};
    let loopTokens = 0;

    const isLoopStep = (e: RuntimeEvent): boolean => {
      const stage = String(e.payload?.stageId || e.source_stage || '').toLowerCase();
      const rule = String(e.payload?.rule || '').toLowerCase();
      return stage.includes('loop') || stage.includes('retry') || stage.includes('verification') || rule.includes('improvement') || rule.includes('verification');
    };

    for (const e of events) {
      if (eventTypeOf(e) !== 'llm.response') continue;
      const input = Number(e.payload?.tokensInput ?? e.payload?.inputTokens ?? 0);
      const output = Number(e.payload?.tokensOutput ?? e.payload?.outputTokens ?? 0);
      const tokens = (Number.isFinite(input) ? input : 0) + (Number.isFinite(output) ? output : 0);
      if (tokens <= 0) continue;
      const agent = String(e.payload?.agentSlug || e.actor?.id || e.actor?.role || e.agent_role || 'agent:n/a').trim() || 'agent:n/a';
      tokensByAgent[agent] = (tokensByAgent[agent] || 0) + tokens;
      if (isLoopStep(e)) loopTokens += tokens;
    }

    const topAgents = Object.entries(tokensByAgent).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = topAgents.reduce((acc, [, v]) => acc + v, 0) || Object.values(tokensByAgent).reduce((acc, v) => acc + v, 0);
    const loopShare = total > 0 ? Math.round((loopTokens / total) * 100) : 0;
    return { topAgents, loopTokens, loopShare };
  }, [events]);

  const costRuns = useMemo(() => {
    return Array.isArray(costApiData?.perRun) ? costApiData!.perRun : [];
  }, [costApiData]);

  const costInsights = useMemo(() => {
    const topRun = [...costRuns].sort((a, b) => Number(b.totalCostUsd || 0) - Number(a.totalCostUsd || 0))[0] || null;
    const topAgent = Object.entries(costApiData?.perAgent || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || null;
    const topWorkspace = Object.entries(costApiData?.perWorkspace || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0] || null;
    const totalUsd = costRuns.reduce((acc, row) => acc + Number(row.totalCostUsd || 0), 0);
    const totalTokens = costRuns.reduce((acc, row) => acc + Number(row.tokens || 0), 0);
    return { topRun, topAgent, topWorkspace, totalUsd, totalTokens };
  }, [costApiData, costRuns]);

  const runCostGraph = useMemo(() => {
    const recent = [...costRuns].slice(-8);
    const maxCost = recent.reduce((acc, row) => Math.max(acc, Number(row.totalCostUsd || 0)), 0);
    const safeMax = maxCost > 0 ? maxCost : 1;
    return recent.map((row) => ({
      runId: String(row.runId || '').slice(0, 8) || 'n/a',
      cost: Number(row.totalCostUsd || 0),
      widthPct: Math.max(4, Math.round((Number(row.totalCostUsd || 0) / safeMax) * 100)),
      tokens: Number(row.tokens || 0),
    }));
  }, [costRuns]);

  return (
    <div className="mt-4 grid gap-4 overflow-hidden">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Governance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-44 px-4 pb-4">
            {governanceRows.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground italic">No governance events yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {governanceRows.slice(-20).map((row) => (
                  <div key={row.id} className="rounded-md border border-border/50 bg-secondary/20 p-2 text-xs transition-colors hover:bg-secondary/30">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-foreground">{row.rule}</span>
                      <Badge variant={row.status === 'PASS' ? 'success' : 'destructive'} className="h-4 px-1.5 text-[10px]">
                        {row.status}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">action: {row.action}</div>
                    {row.detail && <div className="mt-1 text-[10px] text-muted-foreground/80 leading-relaxed border-t border-border/30 pt-1">{row.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Violation / Enforcement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-40 px-4 pb-4">
            {enforcementRows.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground italic">No enforcement events yet.</div>
            ) : (
              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                {enforcementRows.slice(-30).map((row) => (
                  <div key={row.id} className="flex flex-col gap-1 rounded bg-secondary/10 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/60">{new Date(row.at).toLocaleTimeString()}</span>
                      <Badge variant="outline" className="h-3.5 px-1 text-[9px] uppercase">{row.type.replace('guard.', '')}</Badge>
                      {row.rule && row.rule !== 'n/a' && <span className="text-accent underline decoration-accent/30 underline-offset-2">@{row.rule}</span>}
                    </div>
                    {row.reason && <div className="text-foreground/70">{row.reason}</div>}
                    {row.action && <div className="text-muted-foreground">→ status: {row.action}</div>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Loops</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded border bg-background/50 p-1.5 text-center">
                <span className="block text-lg font-medium">{loopStats.retry}</span>
                <span className="text-[9px] text-muted-foreground uppercase">Retry</span>
              </div>
              <div className="rounded border bg-background/50 p-1.5 text-center">
                <span className="block text-lg font-medium">{loopStats.verify}</span>
                <span className="text-[9px] text-muted-foreground uppercase">Verify</span>
              </div>
              <div className="rounded border bg-background/50 p-1.5 text-center">
                <span className="block text-lg font-medium">{loopStats.improve}</span>
                <span className="text-[9px] text-muted-foreground uppercase">Refine</span>
              </div>
            </div>
            {loopRows.length > 0 && (
              <ScrollArea className="h-28">
                <div className="space-y-1.5">
                  {loopRows.map((row) => (
                    <div key={row.key} className="flex items-center justify-between rounded border bg-secondary/10 px-2 py-1 text-[10px]">
                      <span className="capitalize">{row.loopType}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">i:{row.iterationCount}</span>
                        <Badge
                          variant={row.result === 'pass' ? 'success' : row.result === 'fail' ? 'destructive' : 'secondary'}
                          className="h-3.5 px-1 text-[8px] uppercase font-bold"
                        >
                          {row.result}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Planning</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div>
                <span className="block text-sm font-medium">{planSummary.agents.length}</span>
                <span className="text-[9px] text-muted-foreground uppercase">Agents</span>
              </div>
              <div>
                <span className="block text-sm font-medium">{planSummary.pipelines.length}</span>
                <span className="text-[9px] text-muted-foreground uppercase">Pipes</span>
              </div>
              <div>
                <span className="block text-sm font-medium">{planSummary.tools.length}</span>
                <span className="text-[9px] text-muted-foreground uppercase">Tools</span>
              </div>
            </div>
            <Separator className="my-2 opacity-50" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase">Drift Status</span>
              <Badge variant={planDiff.mismatch ? 'warning' : 'success'} className="h-4 px-1.5 text-[9px]">
                {planDiff.mismatch ? 'Mismatch Detected' : 'Aligned'}
              </Badge>
            </div>
            <ScrollArea className="h-16 text-[9px] font-mono space-y-1">
              {planDiff.missingAgents.length > 0 && <div className="text-destructive">Missing agents: {planDiff.missingAgents.join(', ')}</div>}
              {planDiff.extraAgents.length > 0 && <div className="text-warning">Extra agents: {planDiff.extraAgents.join(', ')}</div>}
              {planDiff.missingSteps.length > 0 && <div className="text-destructive">Missing steps: {planDiff.missingSteps.join(', ')}</div>}
              {planDiff.extraSteps.length > 0 && <div className="text-warning">Extra steps: {planDiff.extraSteps.join(', ')}</div>}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Cost Meter</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Total Tokens</span>
              <span className="font-mono font-bold text-accent">{tokenBreakdown.totalTokens.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between border-b border-border/50 pb-0.5">
                <span className="text-muted-foreground">LLM Req</span>
                <span>{costSummary.llmReq}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-0.5">
                <span className="text-muted-foreground">LLM Res</span>
                <span>{costSummary.llmRes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prompt Chars</span>
                <span>{Math.round(costSummary.promptChars/1000)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output Chars</span>
                <span>{Math.round(costSummary.outputChars/1000)}k</span>
              </div>
            </div>
            <ScrollArea className="h-14 mt-1 border rounded bg-background/30 p-1.5">
              <div className="text-[9px] font-mono text-muted-foreground">
                {tokenBreakdown.perAgentTop.map(([k, v]) => (
                  <div key={k} className="flex justify-between truncate">
                    <span>{k}:</span>
                    <span className="text-foreground">{v.toLocaleString()}t</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Resource Attribution</CardTitle>
          <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-accent/20 text-accent">
            Loop Overhead: {costBreakdown.loopShare}%
          </Badge>
        </CardHeader>
        <CardContent className="px-4 pb-4">
           {costBreakdown.topAgents.length === 0 ? (
             <div className="py-2 text-center text-xs text-muted-foreground italic">No attribution data.</div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
               {costBreakdown.topAgents.map(([agent, tokens]) => (
                 <div key={agent} className="rounded border bg-secondary/10 p-2 text-center group transition-colors hover:border-accent/30">
                   <div className="text-[9px] text-muted-foreground uppercase mb-1 truncate">{agent}</div>
                   <div className="text-sm font-mono font-bold">{tokens.toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground">tk</span></div>
                   <div className="mt-1 h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent grayscale group-hover:grayscale-0 transition-all" style={{ width: `${Math.min(100, (tokens/tokenBreakdown.totalTokens)*100)}%` }} />
                   </div>
                 </div>
               ))}
             </div>
           )}
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-accent/5">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-accent flex items-center gap-2">
            Cost Intelligence (System API)
            {costLoading && <Badge variant="outline" className="animate-pulse h-3.5 border-accent/20">Syncing...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {costError ? (
            <div className="text-xs text-destructive/80 bg-destructive/10 rounded p-2 border border-destructive/20">{costError}</div>
          ) : costRuns.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">No historical billing data available.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-muted-foreground uppercase">Project Total</div>
                  <div className="text-2xl font-mono font-bold">${costInsights.totalUsd.toFixed(4)}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-muted-foreground uppercase">Tokens Processed</div>
                  <div className="text-lg font-mono">{costInsights.totalTokens.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Recent Run Efficiency</div>
                <div className="flex flex-col gap-1.5">
                  {runCostGraph.map((row) => (
                    <div key={row.runId} className="group">
                      <div className="flex justify-between items-center mb-0.5 font-mono text-[9px]">
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">ID: {row.runId}</span>
                        <span className="text-accent">${row.cost.toFixed(4)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-accent/80 transition-all duration-500" style={{ width: `${row.widthPct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                 <div className="rounded border bg-background/50 p-2 transition-colors hover:bg-background">
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold mb-1">Top Spend Run</span>
                    <span className="text-[10px] font-mono truncate block">
                      {costInsights.topRun ? `${String(costInsights.topRun.runId).slice(0, 8)} ($${Number(costInsights.topRun.totalCostUsd || 0).toFixed(4)})` : 'n/a'}
                    </span>
                 </div>
                 <div className="rounded border bg-background/50 p-2 transition-colors hover:bg-background">
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold mb-1">Hungriest Agent</span>
                    <span className="text-[10px] font-mono truncate block">
                      {costInsights.topAgent ? `${costInsights.topAgent[0]} ($${Number(costInsights.topAgent[1] || 0).toFixed(4)})` : 'n/a'}
                    </span>
                 </div>
                 <div className="rounded border bg-background/50 p-2 transition-colors hover:bg-background">
                    <span className="block text-[8px] text-muted-foreground uppercase font-bold mb-1">Worst Workspace</span>
                    <span className="text-[10px] font-mono truncate block">
                      {costInsights.topWorkspace ? `${costInsights.topWorkspace[0]} ($${Number(costInsights.topWorkspace[1] || 0).toFixed(4)})` : 'n/a'}
                    </span>
                 </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4 cursor-pointer hover:bg-secondary/10 transition-colors" onClick={() => setPlanOpen((v) => !v)}>
          <CardTitle className="text-xs uppercase flex items-center justify-between">
            Execution Plan Viewer
            <span className="text-muted-foreground">{planOpen ? '▼' : '►'}</span>
          </CardTitle>
        </CardHeader>
        {planOpen && (
          <CardContent className="px-4 pb-4">
             {!latestPlan ? (
               <div className="py-4 text-center text-xs text-muted-foreground">No plan found in run.started payload.</div>
             ) : (
               <ScrollArea className="h-64 rounded-md border bg-black/40">
                  <pre className="p-3 text-[10px] font-mono leading-relaxed text-slate-300">
                    {JSON.stringify(latestPlan, null, 2)}
                  </pre>
               </ScrollArea>
             )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Workbench / Tool Usage</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-4 mb-3 text-[10px]">
             <div className="bg-secondary/30 rounded px-2 py-1 border">
               <span className="text-muted-foreground">Top Tool:</span> <span className="font-mono">{toolUsageSummary.topTool ? `${toolUsageSummary.topTool[0]} (${toolUsageSummary.topTool[1].count})` : 'n/a'}</span>
             </div>
             <div className="bg-secondary/30 rounded px-2 py-1 border">
               <span className="text-muted-foreground">Top Agent:</span> <span className="font-mono">{toolUsageSummary.topAgent ? `${toolUsageSummary.topAgent[0]} (${toolUsageSummary.topAgent[1].count})` : 'n/a'}</span>
             </div>
          </div>
          <ScrollArea className="h-36">
            {toolRows.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground italic">No tool events logged.</div>
            ) : (
              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                {toolRows.slice(-20).map((row, i) => (
                  <div key={`${row.at}:${row.agent}:${row.tool}:${i}`} className="flex items-start gap-2 rounded bg-secondary/10 p-2 hover:bg-secondary/20 transition-colors">
                    <span className="text-muted-foreground/50 shrink-0">{new Date(row.at).toLocaleTimeString()}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-accent underline decoration-accent/20 underline-offset-2">@{row.agent}</span>
                        <span className="text-foreground/80 font-bold">{row.tool}</span>
                      </div>
                      {row.summary && <div className="mt-1 text-muted-foreground leading-tight italic">{row.summary}</div>}
                      {Number.isFinite(row.durationMs) && row.durationMs > 0 && (
                         <div className="mt-1 text-right"><Badge variant="outline" className="h-3.5 px-1 text-[8px] bg-background/50">{row.durationMs}ms</Badge></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4 cursor-pointer hover:bg-secondary/10 transition-colors" onClick={() => setDebugOpen((v) => !v)}>
          <CardTitle className="text-xs uppercase flex items-center justify-between">
            Debug / Raw Events
            <span className="text-muted-foreground">{debugOpen ? '▼' : '►'}</span>
          </CardTitle>
        </CardHeader>
        {debugOpen && (
          <CardContent className="px-4 pb-4">
             <ScrollArea className="h-64 rounded-md border bg-black/40">
                <pre className="p-3 text-[10px] font-mono leading-relaxed text-slate-300">
                  {JSON.stringify(events.slice(-50), null, 2)}
                </pre>
             </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ObservabilityPanels;
