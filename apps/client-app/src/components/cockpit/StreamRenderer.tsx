import { useState, useEffect, useRef, type FC } from 'react';
import { Wrench, GitBranch, TerminalSquare, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Activity, Brain, MessageSquare, ChevronsDownUp, ChevronsUpDown, Cpu } from 'lucide-react';
import { ArtifactRenderer } from './ArtifactRenderer';
import { Button } from '../ui/button';

export interface RuntimeEvent {
    event_id?: string;
    id?: string;
    event_type?: string;
    type?: string;
    timestamp: string;
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
    event_status?: string; // Standardized
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

const DEFAULT_EXPANDED_TYPES = ['system.thought', 'agent.message', 'contract_fail'];

const StreamEventCard: FC<StreamEventCardProps> = ({ event, index, forceExpanded }) => {
    const eventType = String(event.event_type || event.type || '').trim();
    const isHandoff = eventType === 'swarm_handoff' || eventType === 'swarm.handoff';
    const defaultExpanded = DEFAULT_EXPANDED_TYPES.includes(eventType);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [visible, setVisible] = useState(false);
    const mountedRef = useRef(false);

    useEffect(() => {
        if (mountedRef.current) return;
        mountedRef.current = true;
        const delay = Math.min(index * 40, 400);
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [index]);

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
    let iconColorClass = 'text-muted-foreground/50';
    let containerClass = 'border border-border/40 rounded-xl bg-card/20 backdrop-blur-sm overflow-hidden text-xs transition-all hover:bg-card/40 hover:border-border/60';

    if (eventType === 'stage.started' || eventType === 'agent.started') {
        const stageLabel = String(event.payload?.stageTitle || event.payload?.stageId || event.source_stage || 'n/a').trim();
        title = `Agent ${roleLabel} initialized stage: ${stageLabel}`;
        icon = <TerminalSquare size={14} />;
        iconColorClass = 'text-primary';
        containerClass = 'border border-primary/20 rounded-xl bg-primary/5 overflow-hidden text-xs shadow-sm shadow-primary/5';
    } else if (eventType === 'swarm_stage_completed') {
        const stageLabel = String(event.payload?.stageTitle || event.payload?.stageId || event.source_stage || 'n/a').trim();
        const summary = String(event.payload?.summary || event.payload?.message || '').trim();
        title = `Protocol Success: ${roleLabel} (${stageLabel})`;
        bodyText = summary;
        icon = <CheckCircle2 size={14} />;
        iconColorClass = 'text-green-500';
        containerClass = 'border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden text-xs text-foreground/80';
    } else if (isHandoff) {
        const fromAgent = String(event.payload?.fromAgentTitle || event.payload?.fromAgentId || 'unknown').trim();
        const toAgent = String(event.payload?.toAgentTitle || event.payload?.toAgentId || roleLabel || 'unknown').trim();
        const toStage = String(event.payload?.toStageTitle || event.payload?.toStageId || event.payload?.stageTitle || event.payload?.stageId || event.source_stage || 'n/a').trim();
        title = `Context Relay: ${fromAgent} → ${toAgent} [${toStage}]`;
        icon = <GitBranch size={14} />;
        iconColorClass = 'text-amber-500';
        containerClass = 'border border-amber-500/20 rounded-xl bg-amber-500/5 overflow-hidden text-xs text-foreground/80';
    } else if (eventType === 'tool.called' || eventType === 'tool.call') {
        const tool = String(event.payload?.tool || 'tool').trim();
        const summary = String(event.payload?.summary || '').trim();
        title = `Active Tool: ${tool} [${roleLabel}]`;
        bodyText = summary || '(No telemetry summary)';
        icon = <Wrench size={14} />;
        iconColorClass = 'text-blue-500';
        containerClass = 'border border-blue-500/20 rounded-xl bg-blue-500/5 overflow-hidden text-xs font-mono';
    } else if (eventType === 'tool.result') {
        title = `Telemetry Return: ${roleLabel}`;
        bodyText = String(event.payload?.summary || event.payload?.content || '(No additional telemetry)').trim();
        icon = <Wrench size={14} />;
        iconColorClass = 'text-blue-400';
    } else if (eventType === 'contract_reprompt') {
        title = `Schema Variance: Reprompting ${roleLabel}`;
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-amber-500';
        containerClass = 'border border-amber-500/20 rounded-xl bg-amber-500/5 overflow-hidden text-xs';
    } else if (eventType === 'contract_fail') {
        const errors = Array.isArray(event.payload?.errors) ? event.payload.errors : [];
        title = `Contract Violation Detected`;
        bodyText = errors.map((err) => `- ${err}`).join('\n');
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-destructive';
        containerClass = 'border border-destructive/30 rounded-xl bg-destructive/5 overflow-hidden text-xs text-foreground/90';
    } else if (eventType === 'contract_pass') {
        title = `Contract Verified: ${roleLabel}`;
        icon = <CheckCircle2 size={14} />;
        iconColorClass = 'text-green-500';
        containerClass = 'border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden text-xs';
    } else if (eventType === 'system.thought') {
        const message = String(event.payload?.message || event.payload?.content || '').trim();
        title = `Cognition: ${roleLabel}`;
        bodyText = message || '(Empty thought trace)';
        icon = <Brain size={14} />;
        iconColorClass = 'text-muted-foreground/60';
        containerClass = 'border border-transparent rounded-xl bg-muted/20 overflow-hidden text-xs text-muted-foreground italic';
    } else if (eventType === 'agent.message') {
        const message = String(event.payload?.message || event.payload?.content || '').trim();
        title = `Transmission: ${roleLabel}`;
        bodyText = message || '(Empty transmission)';
        icon = <MessageSquare size={14} />;
        iconColorClass = 'text-primary/70';
        containerClass = 'border border-border/50 rounded-xl bg-secondary/30 overflow-hidden text-sm leading-relaxed';
    } else if (eventType === 'guard.retry') {
        const attemptRaw = Number(event.payload?.attempt ?? event.payload?.iteration ?? 1);
        const attempt = Number.isFinite(attemptRaw) && attemptRaw > 0 ? attemptRaw : 1;
        title = `Resilience Protocol: Retry #${attempt}`;
        bodyText = [String(event.payload?.rule || '').trim(), String(event.payload?.reason || '').trim()].filter(Boolean).join('\n');
        icon = <Activity size={14} />;
        iconColorClass = 'text-amber-400';
        containerClass = 'border border-amber-500/20 rounded-xl bg-amber-500/5 overflow-hidden text-xs';
    } else if (eventType === 'governance.rule_check') {
        const detail = String(event.payload?.detail || '').trim();
        const rule = String(event.payload?.rule || 'governance').trim();
        const status = String(event.payload?.status || event.payload?.outcome || 'unknown').trim().toLowerCase();
        title = `Compliance Check: ${rule}`;
        bodyText = detail || `Outcome: ${status.toUpperCase()}`;
        icon = <CheckCircle2 size={14} />;
        if (status === 'fail' || status === 'failed' || status === 'blocked') {
            iconColorClass = 'text-destructive';
            containerClass = 'border border-destructive/20 rounded-xl bg-destructive/5 overflow-hidden text-xs';
        } else {
            iconColorClass = 'text-green-500';
            containerClass = 'border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden text-xs';
        }
    } else if (eventType === 'worker.starting' || eventType === 'worker.spawned' || eventType === 'worker.reused') {
        title = `Compute Node Spawned: ${String(event.payload?.agentSlug || roleLabel || 'worker').trim()}`;
        icon = <Cpu size={14} />;
        iconColorClass = 'text-cyan-500';
        containerClass = 'border border-cyan-500/20 rounded-xl bg-cyan-500/5 overflow-hidden text-xs';
    } else if (eventType === 'agent.completed' || eventType === 'run.completed') {
        title = eventType === 'run.completed' ? 'Operation Success' : `Agent Mission Complete: ${roleLabel}`;
        bodyText = String(event.payload?.summary || event.payload?.message || '').trim();
        icon = <CheckCircle2 size={14} />;
        iconColorClass = 'text-green-500';
        containerClass = 'border border-green-500/30 rounded-xl bg-green-500/10 overflow-hidden text-xs font-bold';
    } else if (eventType === 'run.failed' || eventType === 'guard.block' || eventType === 'guard.escalate') {
        title = `Operation Fault: ${eventType.toUpperCase()}`;
        bodyText = String(event.payload?.detail || event.payload?.message || '(No error trace available)').trim();
        icon = <AlertTriangle size={14} />;
        iconColorClass = 'text-destructive';
        containerClass = 'border border-destructive/20 rounded-xl bg-destructive/10 overflow-hidden text-xs';
    } else {
        title = `${eventType || 'System Event'}: ${roleLabel}`;
        bodyText = String(event.payload?.message || event.payload?.detail || JSON.stringify(event.payload || {}, null, 2)).trim();
    }

    const hasBody = !!bodyText;

    return (
        <div
            className={containerClass}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
        >
            <div
                className="flex items-center gap-3 px-4 py-2.5 select-none bg-white/5 transition-colors duration-200 hover:bg-white/10"
                onClick={() => hasBody && setExpanded(!expanded)}
                style={{ cursor: hasBody ? 'pointer' : 'default' }}
            >
                <div className={`flex items-center justify-center ${iconColorClass}`}>
                    {icon}
                </div>
                <div className="flex-1 font-black uppercase tracking-widest text-[10px] text-foreground/80 whitespace-nowrap overflow-hidden text-ellipsis">
                    {title}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground/50 tabular-nums">
                    {timeFormatted}
                </div>
                {hasBody && (
                    <div className="flex items-center justify-center text-muted-foreground/30">
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                )}
            </div>
            {hasBody && expanded && (
                <div className="px-5 py-4 border-t border-border/30 bg-background/40 text-foreground/90 animate-in fade-in slide-in-from-top-1 duration-300">
                    <ArtifactRenderer content={bodyText} />
                </div>
            )}
        </div>
    );
};

interface StreamRendererProps {
    events: RuntimeEvent[];
}

export const StreamRenderer: FC<StreamRendererProps> = ({ events }) => {
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
        <div className="flex flex-col gap-2.5 my-2 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 px-2 mb-2">
                <div className="flex items-center gap-2">
                    <span className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_var(--color-primary/50)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{orderedEvents.length} Sequential Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg border border-border/30 gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setAllExpanded(prev => prev === true ? false : true)}
                    >
                        <ChevronsUpDown size={11} className="opacity-50" />
                        Expand
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg border border-border/30 gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setAllExpanded(false)}
                    >
                        <ChevronsDownUp size={11} className="opacity-50" />
                        Collapse
                    </Button>
                </div>
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

export default StreamRenderer;
