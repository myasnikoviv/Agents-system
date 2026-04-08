import React, { useState, useEffect, useRef } from 'react';
import { Wrench, GitBranch, TerminalSquare, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Activity, Brain, MessageSquare, ChevronsDownUp, ChevronsUpDown, Cpu } from 'lucide-react';
import { ArtifactRenderer } from './ArtifactRenderer';

export interface RuntimeEvent {
    event_id?: string;
    id?: string;
    event_type?: string;
    type?: string;
    timestamp: string | number;
    pipeline_run_id?: string;
    runId?: string;
    chainId?: string;
    actor?: {
        type?: 'agent' | 'system';
        id?: string;
        role?: string;
    };
    agent_role?: string;
    source_stage?: string;
    target_stage?: string;
    status?: string;
    plane_issue_id?: string;
    thread_id?: string;
    payload?: {
        [key: string]: any;
        pipelineId?: string;
        stageId?: string;
        stageTitle?: string;
        nextStageId?: string;
        fromStageId?: string;
        toStageId?: string;
        fromAgentId?: string;
        fromAgentTitle?: string;
        toAgentId?: string;
        toAgentTitle?: string;
        toStageTitle?: string;
        outcome?: string;
        tool?: string;
        summary?: string;
        message?: string;
        content?: string;
        errors?: string[];
        detail?: string;
        agentSlug?: string;
        workerId?: string;
        state?: string;
        from?: string;
        to?: string;
        heartbeatCount?: number;
        queueDepth?: number;
        queueDepthAfterPickup?: number;
        reason?: string;
        rule?: string;
        action?: string;
        status?: string;
        prompt?: string;
        response?: string;
    };
}

interface StreamEventCardProps {
    event: RuntimeEvent;
    index: number;
    forceExpanded?: boolean;
}

const PRIORITY_TYPES = [
    'tool.call',
    'tool.result',
    'tool.called',
    'stage.started',
    'swarm_stage_completed',
    'swarm_handoff',
    'swarm.handoff',
    'agent.started',
    'agent.completed',
    'run.started',
    'run.completed',
    'run.failed',
    'run.cancelled',
    'guard.block',
    'guard.escalate',
    'guard.retry',
    'contract_reprompt',
    'contract_fail',
    'contract_pass',
    'system.thought',
    'agent.message',
    'governance.rule_check',
    'worker.starting',
    'worker.spawned',
    'worker.reused',
    'worker.heartbeat',
    'worker.state_changed',
    'worker.failed',
    'worker.unhealthy',
    'task.queued',
    'task.dispatched'
];

// Types that have a body and should start expanded
const DEFAULT_EXPANDED_TYPES = ['system.thought', 'agent.message', 'contract_fail'];

const StreamEventCard: React.FC<StreamEventCardProps> = ({ event, index, forceExpanded }) => {
    const eventType = String(event.event_type || event.type || '').trim();
    const isHandoff = eventType === 'swarm_handoff' || eventType === 'swarm.handoff';
    const defaultExpanded = DEFAULT_EXPANDED_TYPES.includes(eventType);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [visible, setVisible] = useState(false);
    const mountedRef = useRef(false);

    // S5-7: Progressive entrance animation — staggered by index
    useEffect(() => {
        if (mountedRef.current) return;
        mountedRef.current = true;
        const delay = Math.min(index * 40, 400); // max 400ms stagger
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [index]);

    // S5-8: Respond to forceExpanded from parent
    useEffect(() => {
        if (forceExpanded !== undefined) {
            setExpanded(forceExpanded);
        }
    }, [forceExpanded]);

    const roleLabel = String(event.agent_role || event.actor?.role || event.actor?.id || 'system').trim();
    const timeFormatted = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
    
    let title = '';
    let icon = <Activity size={14} />;
    let bodyText = '';
    let iconColorClass = 'text-slate-400';
    let containerClass = 'border border-white/10 rounded-md bg-slate-900/40 overflow-hidden text-sm';

    if (eventType === 'stage.started' || eventType === 'agent.started') {
        const stageLabel = String(event.payload?.stageTitle || event.payload?.stageId || event.source_stage || 'n/a').trim();
        title = `Agent ${roleLabel} started stage: ${stageLabel}`;
        icon = <TerminalSquare size={14} />;
        iconColorClass = 'text-purple-500';
        containerClass = 'border border-purple-500/20 rounded-md bg-slate-900/60 overflow-hidden text-sm';
    } else if (eventType === 'swarm_stage_completed') {
        const stageLabel = String(event.payload?.stageTitle || event.payload?.stageId || event.source_stage || 'n/a').trim();
        const summary = String(event.payload?.summary || event.payload?.message || '').trim();
        title = `Stage completed: ${roleLabel} (${stageLabel})`;
        bodyText = summary;
        icon = <CheckCircle2 size={14} />;
        iconColorClass = 'text-emerald-400';
        containerClass = 'border border-emerald-500/20 rounded-md bg-emerald-950/20 overflow-hidden text-sm text-emerald-100';
    } else if (isHandoff) {
        const fromAgent = String(event.payload?.fromAgentTitle || event.payload?.fromAgentId || 'unknown').trim();
        const toAgent = String(event.payload?.toAgentTitle || event.payload?.toAgentId || roleLabel || 'unknown').trim();
        const toStage = String(event.payload?.toStageTitle || event.payload?.toStageId || event.payload?.stageTitle || event.payload?.stageId || event.source_stage || 'n/a').trim();
        title = `Handoff: ${fromAgent} \u2192 ${toAgent} (stage: ${toStage})`;
        icon = <GitBranch size={14} />;
        iconColorClass = 'text-amber-400';
        containerClass = 'border border-amber-500/30 rounded-md bg-amber-500/10 overflow-hidden text-sm text-amber-200';
    } else if (eventType === 'tool.called' || eventType === 'tool.call') {
        const tool = String(event.payload?.tool || 'tool').trim();
        const summary = String(event.payload?.summary || '').trim();
        title = `Tool execution: ${tool} by ${roleLabel}`;
        bodyText = summary || '(No summary available)';
        icon = <Wrench size={14} />;
        iconColorClass = 'text-blue-500';
        containerClass = 'border border-blue-500/20 rounded-md bg-slate-950/80 overflow-hidden text-sm font-mono';
    } else if (eventType === 'tool.result') {
        title = `Tool result: ${roleLabel}`;
        bodyText = String(event.payload?.summary || event.payload?.content || '(No details available)').trim();
        icon = <Wrench size={14} />;
        iconColorClass = 'text-blue-300';
        containerClass = 'border border-blue-500/20 rounded-md bg-slate-900/50 overflow-hidden text-sm';
    } else if (eventType === 'contract_reprompt') {
        title = `Contract Guard: ${roleLabel} is reformatting response`;
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-amber-500';
        containerClass = 'border border-amber-500/20 rounded-md bg-slate-900/60 overflow-hidden text-sm';
    } else if (eventType === 'contract_fail') {
        const errors = Array.isArray(event.payload?.errors) ? event.payload.errors : [];
        title = `Contract Guard Flagged Issues`;
        bodyText = errors.map((err) => `- ${err}`).join('\n');
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-red-500';
        containerClass = 'border border-red-500/20 rounded-md bg-red-950/30 overflow-hidden text-sm text-red-100';
    } else if (eventType === 'contract_pass') {
        title = `Contract Guard Passed for ${roleLabel}`;
        icon = <CheckCircle2 size={14} />;
        iconColorClass = 'text-emerald-500';
        containerClass = 'border border-emerald-500/20 rounded-md bg-emerald-950/30 overflow-hidden text-sm text-emerald-100';
    } else if (eventType === 'system.thought') {
        const message = String(event.payload?.message || event.payload?.content || '').trim();
        title = `Thought: ${roleLabel}`;
        bodyText = message || '(No details available)';
        icon = <Brain size={14} />;
        iconColorClass = 'text-slate-500';
        containerClass = 'border border-transparent rounded-md bg-slate-800/30 overflow-hidden text-sm text-slate-400';
    } else if (eventType === 'agent.message') {
        const message = String(event.payload?.message || event.payload?.content || '').trim();
        title = `Message: ${roleLabel}`;
        bodyText = message || '(Empty message)';
        icon = <MessageSquare size={14} />;
        iconColorClass = 'text-slate-300';
        containerClass = 'border border-white/10 rounded-md bg-slate-800/60 overflow-hidden text-sm text-slate-200';
    } else if (eventType === 'guard.retry') {
        const attemptRaw = Number(event.payload?.attempt ?? event.payload?.iteration ?? 1);
        const attempt = Number.isFinite(attemptRaw) && attemptRaw > 0 ? attemptRaw : 1;
        const rule = String(event.payload?.rule || event.payload?.ruleId || '').trim();
        const step = String(event.payload?.stepId || event.payload?.stageId || '').trim();
        title = `Loop progress: retry #${attempt}`;
        bodyText = [rule ? `rule: ${rule}` : '', step ? `step: ${step}` : '', String(event.payload?.reason || event.payload?.detail || '').trim()]
            .filter(Boolean)
            .join('\n');
        icon = <Activity size={14} />;
        iconColorClass = 'text-amber-400';
        containerClass = 'border border-amber-500/20 rounded-md bg-amber-950/20 overflow-hidden text-sm text-amber-100';
    } else if (eventType === 'governance.rule_check') {
        const detail = String(event.payload?.detail || '').trim();
        const rule = String(event.payload?.rule || 'governance').trim();
        const status = String(event.payload?.status || event.payload?.outcome || 'unknown').trim().toLowerCase();
        const isLoopRule =
            rule.includes('verification') ||
            rule.includes('postflight') ||
            rule.includes('required_pipeline_usage') ||
            rule.includes('improvement') ||
            rule.includes('learning');
        title = isLoopRule ? `Loop result: ${rule}` : `Governance: ${rule}`;
        bodyText = isLoopRule ? `${status || 'unknown'}${detail ? `\n${detail}` : ''}` : (detail || '(No details available)');
        icon = <CheckCircle2 size={14} />;
        if (isLoopRule && (status === 'fail' || status === 'failed' || status === 'blocked')) {
            iconColorClass = 'text-red-400';
            containerClass = 'border border-red-500/20 rounded-md bg-red-950/20 overflow-hidden text-sm text-red-100';
        } else if (isLoopRule && (status === 'pass' || status === 'passed' || status === 'ok')) {
            iconColorClass = 'text-emerald-400';
            containerClass = 'border border-emerald-500/20 rounded-md bg-emerald-950/20 overflow-hidden text-sm text-emerald-100';
        } else {
            iconColorClass = 'text-emerald-400';
            containerClass = 'border border-emerald-500/20 rounded-md bg-emerald-950/20 overflow-hidden text-sm text-emerald-100';
        }
    } else if (eventType === 'worker.starting' || eventType === 'worker.spawned' || eventType === 'worker.reused') {
        const workerId = String(event.payload?.workerId || '').trim();
        const state = String(event.payload?.state || '').trim();
        title = `${eventType}: ${String(event.payload?.agentSlug || roleLabel || 'worker').trim()}`;
        bodyText = [workerId ? `workerId: ${workerId}` : '', state ? `state: ${state}` : ''].filter(Boolean).join('\n');
        icon = <Cpu size={14} />;
        iconColorClass = 'text-cyan-400';
        containerClass = 'border border-cyan-500/20 rounded-md bg-cyan-950/20 overflow-hidden text-sm text-cyan-100';
    } else if (eventType === 'worker.heartbeat' || eventType === 'worker.state_changed') {
        const from = String(event.payload?.from || '').trim();
        const to = String(event.payload?.to || '').trim();
        const hb = String(event.payload?.heartbeatCount || '').trim();
        title = `${eventType}: ${String(event.payload?.agentSlug || roleLabel || 'worker').trim()}`;
        bodyText = [from && to ? `transition: ${from} -> ${to}` : '', hb ? `heartbeatCount: ${hb}` : ''].filter(Boolean).join('\n') || '(No details available)';
        icon = <Activity size={14} />;
        iconColorClass = 'text-indigo-400';
        containerClass = 'border border-indigo-500/20 rounded-md bg-indigo-950/20 overflow-hidden text-sm text-indigo-100';
    } else if (eventType === 'task.queued' || eventType === 'task.dispatched') {
        title = `${eventType}: ${String(event.payload?.agentSlug || roleLabel || 'agent').trim()}`;
        bodyText = [
            `taskId: ${String(event.payload?.taskId || 'n/a').trim()}`,
            `stage: ${String(event.payload?.stageId || 'n/a').trim()}`,
            event.payload?.queueDepth !== undefined ? `queueDepth: ${String(event.payload?.queueDepth)}` : '',
            event.payload?.queueDepthAfterPickup !== undefined ? `queueDepthAfterPickup: ${String(event.payload?.queueDepthAfterPickup)}` : '',
        ].filter(Boolean).join('\n');
        icon = <GitBranch size={14} />;
        iconColorClass = 'text-fuchsia-400';
        containerClass = 'border border-fuchsia-500/20 rounded-md bg-fuchsia-950/20 overflow-hidden text-sm text-fuchsia-100';
    } else if (eventType === 'agent.completed' || eventType === 'run.completed') {
        const stageLabel = String(event.payload?.stageTitle || event.payload?.stageId || event.source_stage || '').trim();
        title = eventType === 'run.completed'
            ? 'Run completed'
            : `Agent ${roleLabel} completed${stageLabel ? `: ${stageLabel}` : ''}`;
        bodyText = String(event.payload?.summary || event.payload?.message || '').trim();
        icon = <CheckCircle2 size={14} />;
        iconColorClass = 'text-emerald-500';
        containerClass = 'border border-emerald-500/20 rounded-md bg-emerald-950/20 overflow-hidden text-sm text-emerald-100';
    } else if (eventType === 'run.failed' || eventType === 'guard.block' || eventType === 'guard.escalate') {
        title = eventType === 'run.failed' ? 'Run failed' : `Guard event: ${eventType}`;
        bodyText = String(event.payload?.detail || event.payload?.message || event.payload?.reason || '(No details available)').trim();
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-red-500';
        containerClass = 'border border-red-500/20 rounded-md bg-red-950/30 overflow-hidden text-sm text-red-100';
    } else if (eventType === 'run.cancelled') {
        title = 'Run cancelled';
        bodyText = String(event.payload?.reason || '(No details available)').trim();
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-amber-500';
        containerClass = 'border border-amber-500/20 rounded-md bg-amber-950/20 overflow-hidden text-sm text-amber-100';
    } else {
        const actor = String(event.payload?.agentSlug || roleLabel || 'system').trim();
        title = `${eventType || 'runtime.event'}: ${actor}`;
        bodyText = String(event.payload?.message || event.payload?.detail || event.payload?.summary || '').trim();
        if (!bodyText) {
            bodyText = JSON.stringify(event.payload || {}, null, 2);
        }
        icon = <Activity size={14} />;
        iconColorClass = 'text-slate-400';
        containerClass = 'border border-white/10 rounded-md bg-slate-900/40 overflow-hidden text-sm';
    }

    const hasBody = !!bodyText;

    return (
        <div
            className={`${containerClass} transition-all duration-300`}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
        >
            <div 
                className="flex items-center gap-2 px-3 py-2 select-none bg-white/5 transition-colors duration-200 hover:bg-white/10" 
                onClick={() => hasBody && setExpanded(!expanded)}
                style={{ cursor: hasBody ? 'pointer' : 'default' }}
            >
                <div className={`flex items-center justify-center ${iconColorClass}`}>
                    {icon}
                </div>
                <div className="flex-1 font-medium text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis">
                    {title}
                </div>
                <div className="text-xs text-slate-500">
                    {timeFormatted}
                </div>
                {hasBody && (
                    <div className="flex items-center justify-center text-slate-400">
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                )}
            </div>
            {hasBody && expanded && (
                <div className="p-3 border-t border-white/5 bg-black/20 text-slate-300 prose prose-sm prose-invert max-w-none prose-pre:bg-black/30 prose-pre:p-2 prose-pre:rounded-md">
                    <ArtifactRenderer content={bodyText} />
                </div>
            )}
        </div>
    );
};

interface StreamRendererProps {
    events: RuntimeEvent[];
}

export const StreamRenderer: React.FC<StreamRendererProps> = ({ events }) => {
    const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);

    if (!events || events.length === 0) return null;

    const visibleEvents = events.filter((e) => String(e.event_type || e.type || '').trim() !== 'connected');
    if (visibleEvents.length === 0) return null;

    const eventSortWeight = (event: RuntimeEvent): number => {
        const eventType = String(event.event_type || event.type || '').trim();
        const idx = PRIORITY_TYPES.indexOf(eventType);
        return idx >= 0 ? idx : PRIORITY_TYPES.length + 1;
    };
    const orderedEvents = [...visibleEvents].sort((a, b) => {
        const byTs = new Date(String(a.timestamp || 0)).getTime() - new Date(String(b.timestamp || 0)).getTime();
        if (byTs !== 0) return byTs;
        return eventSortWeight(a) - eventSortWeight(b);
    });

    return (
        <div className="flex flex-col gap-2 my-3">
            {/* S5-8: Global collapse/expand control */}
            <div className="flex items-center justify-end gap-2 mb-1">
                <span className="text-[0.72rem] text-slate-500">{orderedEvents.length} events</span>
                <button
                    className="inline-flex items-center gap-1 text-[0.72rem] text-slate-400 hover:text-slate-200 border border-white/10 rounded px-2 py-0.5 hover:bg-white/5 transition-colors"
                    onClick={() => setAllExpanded(prev => prev === true ? false : true)}
                    title="Expand all"
                >
                    <ChevronsUpDown size={11} />
                    Expand All
                </button>
                <button
                    className="inline-flex items-center gap-1 text-[0.72rem] text-slate-400 hover:text-slate-200 border border-white/10 rounded px-2 py-0.5 hover:bg-white/5 transition-colors"
                    onClick={() => setAllExpanded(false)}
                    title="Collapse all"
                >
                    <ChevronsDownUp size={11} />
                    Collapse All
                </button>
            </div>
            {orderedEvents.map((event, i) => (
                <StreamEventCard
                    key={event.event_id || event.id || `ev-${i}`}
                    event={event}
                    index={i}
                    forceExpanded={allExpanded}
                />
            ))}
        </div>
    );
};
