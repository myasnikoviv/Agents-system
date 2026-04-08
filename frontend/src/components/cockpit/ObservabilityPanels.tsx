import React, { useMemo, useState } from 'react';
import type { RuntimeEvent } from './StreamRenderer';

interface ObservabilityPanelsProps {
  events: RuntimeEvent[];
}

function eventTypeOf(event: RuntimeEvent): string {
  return String(event.event_type || event.type || '').trim();
}

function tsOf(event: RuntimeEvent): number {
  const raw = event.timestamp;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : Date.now();
}

export const ObservabilityPanels: React.FC<ObservabilityPanelsProps> = ({ events }) => {
  const [debugOpen, setDebugOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

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

  const queueRows = useMemo(() => {
    return events
      .filter((e) => eventTypeOf(e) === 'task.queued' || eventTypeOf(e) === 'task.dispatched')
      .map((e) => ({
        at: tsOf(e),
        type: eventTypeOf(e),
        agent: String(e.payload?.agentSlug || e.actor?.id || 'unknown').trim(),
        queueDepth: Number(e.payload?.queueDepth ?? -1),
        queueDepthAfterPickup: Number(e.payload?.queueDepthAfterPickup ?? -1),
        reason: String(e.payload?.reason || '').trim(),
      }));
  }, [events]);

  const concurrencySummary = useMemo(() => {
    const waitingAgents = new Set<string>();
    const blockingReasons = new Set<string>();
    let activeTool = '';

    for (const row of queueRows) {
      if (row.type === 'task.queued') {
        waitingAgents.add(row.agent);
        if (row.reason) blockingReasons.add(row.reason);
      }
    }

    const latestToolCall = [...events]
      .filter((e) => eventTypeOf(e) === 'tool.call' || eventTypeOf(e) === 'tool.called')
      .sort((a, b) => tsOf(b) - tsOf(a))[0];
    if (latestToolCall) {
      activeTool = String(latestToolCall.payload?.tool || '').trim();
    }

    return {
      waitingAgents: Array.from(waitingAgents),
      activeTool: activeTool || 'n/a',
      blockingReasons: Array.from(blockingReasons),
    };
  }, [events, queueRows]);

  const llmRows = useMemo(() => {
    const reqByKey = new Map<string, RuntimeEvent>();
    const rows: Array<{ key: string; provider: string; model: string; latencyMs: number | null; promptSize: number; outputSize: number; status: 'paired' | 'orphan_response' }> = [];
    for (const e of events) {
      const type = eventTypeOf(e);
      const key = String(e.payload?.traceId || e.id || e.event_id || `${tsOf(e)}`);
      if (type === 'llm.request') {
        reqByKey.set(key, e);
      } else if (type === 'llm.response') {
        const req = reqByKey.get(key);
        const started = req ? tsOf(req) : null;
        const ended = tsOf(e);
        const payloadLatencyRaw = Number(e.payload?.latencyMs ?? e.payload?.durationMs ?? -1);
        const payloadLatency = Number.isFinite(payloadLatencyRaw) && payloadLatencyRaw > 0 ? payloadLatencyRaw : null;
        const latencyMs = started ? Math.max(0, ended - started) : payloadLatency;
        rows.push({
          key,
          provider: String(e.payload?.provider || req?.payload?.provider || 'unknown').trim(),
          model: String(e.payload?.model || req?.payload?.model || e.actor?.id || 'unknown').trim(),
          latencyMs,
          promptSize: String(req?.payload?.prompt || '').length,
          outputSize: String(e.payload?.response || e.payload?.content || '').length,
          status: req ? 'paired' : 'orphan_response',
        });
      }
    }
    return rows.slice(-20);
  }, [events]);

  const promptLogs = useMemo(() => {
    const reqByKey = new Map<string, RuntimeEvent>();
    const rows: Array<{
      key: string;
      step: string;
      model: string;
      prompt: string;
      response: string;
      at: number;
    }> = [];
    for (const e of events) {
      const type = eventTypeOf(e);
      const key = String(e.payload?.traceId || e.id || e.event_id || `${tsOf(e)}`);
      if (type === 'llm.request') {
        reqByKey.set(key, e);
      } else if (type === 'llm.response') {
        const req = reqByKey.get(key);
        const step = String(
          e.payload?.stageId ||
          req?.payload?.stageId ||
          e.payload?.stepId ||
          req?.payload?.stepId ||
          e.source_stage ||
          'n/a',
        ).trim();
        rows.push({
          key,
          step,
          model: String(e.payload?.model || req?.payload?.model || e.actor?.id || 'unknown').trim(),
          prompt: String(req?.payload?.prompt || '').trim(),
          response: String(e.payload?.response || e.payload?.content || '').trim(),
          at: tsOf(e),
        });
      }
    }
    return rows.sort((a, b) => b.at - a.at).slice(0, 15);
  }, [events]);

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

  return (
    <div className="mt-4 grid gap-3">
      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Governance</div>
        {governanceRows.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No governance events yet.</div>
        ) : (
          <div className="mt-2 max-h-44 overflow-auto space-y-1">
            {governanceRows.slice(-20).map((row) => (
              <div key={row.id} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs">
                <div className="font-medium text-slate-200">{row.rule}</div>
                <div className="text-slate-400">{row.status} · action={row.action}</div>
                {row.detail ? <div className="text-slate-500">{row.detail}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Violation / Enforcement</div>
        {enforcementRows.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No enforcement events yet.</div>
        ) : (
          <div className="mt-2 max-h-40 overflow-auto space-y-1">
            {enforcementRows.slice(-30).map((row) => (
              <div key={row.id} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                {new Date(row.at).toLocaleTimeString()} · {row.type}
                {row.rule && row.rule !== 'n/a' ? <span className="text-slate-500"> · rule={row.rule}</span> : null}
                {row.action ? <span className="text-slate-500"> · action={row.action}</span> : null}
                {row.reason ? <div className="text-slate-500">{row.reason}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Loops</div>
          <div className="mt-2 text-xs text-slate-300">retry: {loopStats.retry}</div>
          <div className="text-xs text-slate-300">verification: {loopStats.verify}</div>
          <div className="text-xs text-slate-300">improvement: {loopStats.improve}</div>
          {loopRows.length > 0 ? (
            <div className="mt-2 max-h-28 overflow-auto space-y-1">
              {loopRows.map((row) => (
                <div key={row.key} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                  {row.loopType} · iterations={row.iterationCount}
                  <span className={`ml-1 ${row.result === 'pass' ? 'text-emerald-400' : row.result === 'fail' ? 'text-red-400' : 'text-slate-400'}`}>
                    · {row.result}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Planning</div>
          <div className="mt-2 text-xs text-slate-300">agents: {planSummary.agents.length}</div>
          <div className="text-xs text-slate-300">pipelines: {planSummary.pipelines.length}</div>
          <div className="text-xs text-slate-300">tools: {planSummary.tools.length}</div>
          <div className={`mt-2 text-xs ${planDiff.mismatch ? 'text-amber-300' : 'text-emerald-300'}`}>
            plan diff: {planDiff.mismatch ? 'mismatch' : 'ok'}
          </div>
          {planDiff.missingAgents.length > 0 && (
            <div className="text-xs text-amber-400">missing: {planDiff.missingAgents.join(', ')}</div>
          )}
          {planDiff.extraAgents.length > 0 && (
            <div className="text-xs text-amber-400">extra: {planDiff.extraAgents.join(', ')}</div>
          )}
          {planDiff.missingSteps.length > 0 && (
            <div className="text-xs text-amber-400">missing steps: {planDiff.missingSteps.join(', ')}</div>
          )}
          {planDiff.extraSteps.length > 0 && (
            <div className="text-xs text-amber-400">extra steps: {planDiff.extraSteps.join(', ')}</div>
          )}
        </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Cost</div>
          <div className="mt-2 text-xs text-slate-300">llm requests: {costSummary.llmReq}</div>
          <div className="text-xs text-slate-300">llm responses: {costSummary.llmRes}</div>
          <div className="text-xs text-slate-300">prompt chars: {costSummary.promptChars}</div>
          <div className="text-xs text-slate-300">output chars: {costSummary.outputChars}</div>
          <div className="mt-2 text-xs text-slate-300">tokens total: {tokenBreakdown.totalTokens}</div>
          {tokenBreakdown.perRunTop.length > 0 && (
            <div className="mt-1 text-xs text-slate-500">per run: {tokenBreakdown.perRunTop.map(([k, v]) => `${k.slice(0, 8)}:${v}`).join(' · ')}</div>
          )}
          {tokenBreakdown.perAgentTop.length > 0 && (
            <div className="text-xs text-slate-500">per agent: {tokenBreakdown.perAgentTop.map(([k, v]) => `${k}:${v}`).join(' · ')}</div>
          )}
          {tokenBreakdown.perStepTop.length > 0 && (
            <div className="text-xs text-slate-500">per step: {tokenBreakdown.perStepTop.map(([k, v]) => `${k}:${v}`).join(' · ')}</div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Cost Breakdown</div>
        <div className="mt-2 text-xs text-slate-300">loop cost: {costBreakdown.loopTokens} tokens ({costBreakdown.loopShare}%)</div>
        {costBreakdown.topAgents.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No tokenized agent data yet.</div>
        ) : (
          <div className="mt-2 space-y-1">
            {costBreakdown.topAgents.map(([agent, tokens]) => (
              <div key={agent} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                {agent}: {tokens} tokens
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <button
          className="text-xs uppercase tracking-wide text-slate-300 hover:text-white"
          onClick={() => setPlanOpen((v) => !v)}
        >
          Execution Plan Viewer {planOpen ? '▾' : '▸'}
        </button>
        {!latestPlan ? (
          <div className="mt-2 text-xs text-slate-500">No plan found in run.started payload.</div>
        ) : planOpen ? (
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[11px] text-slate-300">
            {JSON.stringify(latestPlan, null, 2)}
          </pre>
        ) : (
          <div className="mt-2 text-xs text-slate-500">
            agents={Array.isArray((latestPlan as any).agents) ? (latestPlan as any).agents.length : 0} ·
            tools={Array.isArray((latestPlan as any).tools) ? (latestPlan as any).tools.length : 0} ·
            pipelines={Array.isArray((latestPlan as any).pipelines) ? (latestPlan as any).pipelines.length : 0}
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Workbench / Tool Usage</div>
        <div className="mt-2 text-xs text-slate-500">
          top tool: {toolUsageSummary.topTool ? `${toolUsageSummary.topTool[0]} (${toolUsageSummary.topTool[1].count})` : 'n/a'} ·
          top agent: {toolUsageSummary.topAgent ? `${toolUsageSummary.topAgent[0]} (${toolUsageSummary.topAgent[1].count})` : 'n/a'}
        </div>
        {toolRows.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No tool usage events yet.</div>
        ) : (
          <div className="mt-2 max-h-36 overflow-auto space-y-1">
            {toolRows.slice(-20).map((row, i) => (
              <div key={`${row.at}:${row.agent}:${row.tool}:${i}`} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                {new Date(row.at).toLocaleTimeString()} · {row.agent} · {row.tool}
                {Number.isFinite(row.durationMs) && row.durationMs > 0 ? <span className="text-slate-500"> · {row.durationMs}ms</span> : null}
                {row.summary ? <span className="text-slate-500"> · {row.summary}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Tool Concurrency / Queue</div>
        <div className="mt-2 text-xs text-slate-500">
          waiting agents: {concurrencySummary.waitingAgents.length}
          {' · '}active tool: {concurrencySummary.activeTool}
        </div>
        {concurrencySummary.blockingReasons.length > 0 && (
          <div className="text-xs text-amber-400">
            blocking: {concurrencySummary.blockingReasons.join(', ')}
          </div>
        )}
        {queueRows.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No queue events yet.</div>
        ) : (
          <div className="mt-2 max-h-36 overflow-auto space-y-1">
            {queueRows.map((row, i) => (
              <div key={`${row.at}:${row.type}:${row.agent}:${i}`} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                {new Date(row.at).toLocaleTimeString()} · {row.type} · {row.agent}
                {row.queueDepth >= 0 ? <span className="text-slate-500"> · depth={row.queueDepth}</span> : null}
                {row.queueDepthAfterPickup >= 0 ? <span className="text-slate-500"> · after={row.queueDepthAfterPickup}</span> : null}
                {row.reason ? <span className="text-slate-500"> · {row.reason}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">LLM Call Inspector</div>
        {llmRows.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No llm events yet.</div>
        ) : (
          <div className="mt-2 max-h-36 overflow-auto space-y-1">
            {llmRows.map((row) => (
              <div key={row.key} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                {row.provider} · {row.model}
                {row.latencyMs !== null ? <span className="text-slate-500"> · {row.latencyMs}ms</span> : null}
                <span className="text-slate-500"> · in={row.promptSize} · out={row.outputSize}</span>
                <span className={`text-xs ${row.status === 'paired' ? 'text-emerald-400' : 'text-amber-400'}`}> · {row.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <button
          className="text-xs uppercase tracking-wide text-slate-300 hover:text-white"
          onClick={() => setPromptOpen((v) => !v)}
        >
          Raw Prompt Logging {promptOpen ? '▾' : '▸'}
        </button>
        {promptLogs.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No prompt/response logs yet.</div>
        ) : promptOpen ? (
          <div className="mt-2 max-h-64 overflow-auto space-y-2">
            {promptLogs.map((row) => (
              <div key={row.key} className="rounded border border-white/10 bg-black/20 p-2 text-xs text-slate-300">
                <div className="text-slate-400">step={row.step} · model={row.model}</div>
                <div className="mt-1 text-slate-200"><strong>Prompt:</strong> {row.prompt || '(empty)'}</div>
                <div className="mt-1 text-slate-300"><strong>Response:</strong> {row.response || '(empty)'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500">Entries: {promptLogs.length}</div>
        )}
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <button
          className="text-xs uppercase tracking-wide text-slate-300 hover:text-white"
          onClick={() => setDebugOpen((v) => !v)}
        >
          Debug / Raw Events {debugOpen ? '▾' : '▸'}
        </button>
        {debugOpen ? (
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[11px] text-slate-300">
            {JSON.stringify(events.slice(-50), null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
};
