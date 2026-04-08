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

  const toolRows = useMemo(() => {
    const calls = events.filter((e) => eventTypeOf(e) === 'tool.call' || eventTypeOf(e) === 'tool.called');
    return calls.map((e) => ({
      at: tsOf(e),
      agent: String(e.actor?.id || e.actor?.role || 'unknown').trim(),
      tool: String(e.payload?.tool || 'unknown').trim(),
      summary: String(e.payload?.summary || '').trim(),
    }));
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Loops</div>
          <div className="mt-2 text-xs text-slate-300">retry: {loopStats.retry}</div>
          <div className="text-xs text-slate-300">verification: {loopStats.verify}</div>
          <div className="text-xs text-slate-300">improvement: {loopStats.improve}</div>
        </div>

        <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Planning</div>
          <div className="mt-2 text-xs text-slate-300">agents: {planSummary.agents.length}</div>
          <div className="text-xs text-slate-300">pipelines: {planSummary.pipelines.length}</div>
          <div className="text-xs text-slate-300">tools: {planSummary.tools.length}</div>
        </div>

        <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Cost</div>
          <div className="mt-2 text-xs text-slate-300">llm requests: {costSummary.llmReq}</div>
          <div className="text-xs text-slate-300">llm responses: {costSummary.llmRes}</div>
          <div className="text-xs text-slate-300">prompt chars: {costSummary.promptChars}</div>
          <div className="text-xs text-slate-300">output chars: {costSummary.outputChars}</div>
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-slate-900/40 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-400">Workbench / Tool Usage</div>
        {toolRows.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">No tool usage events yet.</div>
        ) : (
          <div className="mt-2 max-h-36 overflow-auto space-y-1">
            {toolRows.slice(-20).map((row, i) => (
              <div key={`${row.at}:${row.agent}:${row.tool}:${i}`} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-300">
                {new Date(row.at).toLocaleTimeString()} · {row.agent} · {row.tool}
                {row.summary ? <span className="text-slate-500"> · {row.summary}</span> : null}
              </div>
            ))}
          </div>
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
