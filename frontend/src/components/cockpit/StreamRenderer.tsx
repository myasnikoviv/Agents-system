import React, { useState } from 'react';
import { Wrench, GitBranch, TerminalSquare, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Activity, Brain, MessageSquare } from 'lucide-react';
import { ArtifactRenderer } from './ArtifactRenderer';

export interface RuntimeEvent {
    event_id: string;
    event_type: string;
    timestamp: string;
    pipeline_run_id?: string;
    agent_role: string;
    source_stage: string;
    target_stage?: string;
    status: string;
    plane_issue_id: string;
    thread_id?: string;
    payload?: {
        pipelineId?: string;
        stageId?: string;
        nextStageId?: string;
        fromStageId?: string;
        toStageId?: string;
        fromAgentId?: string;
        fromAgentTitle?: string;
        toAgentId?: string;
        toAgentTitle?: string;
        outcome?: string;
        tool?: string;
        summary?: string;
        message?: string;
        content?: string;
        errors?: string[];
    };
}

interface StreamEventCardProps {
    event: RuntimeEvent;
}

const StreamEventCard: React.FC<StreamEventCardProps> = ({ event }) => {
    const [expanded, setExpanded] = useState(false);
    
    // We only care about specific technical events: tool.called, stage.started, swarm_handoff
    const eventType = String(event.event_type || '').trim();
    if (!['tool.called', 'stage.started', 'swarm_handoff', 'contract_reprompt', 'contract_fail', 'contract_pass', 'system.thought', 'agent.message'].includes(eventType)) {
        return null;
    }

    const roleLabel = String(event.agent_role || 'system').trim();
    const timeFormatted = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
    
    let title = '';
    let icon = <Activity size={14} />;
    let bodyText = '';
    let iconColorClass = 'text-slate-400';
    let containerClass = 'border border-white/10 rounded-md bg-slate-900/40 overflow-hidden text-sm';

    if (eventType === 'stage.started') {
        const stageLabel = String(event.payload?.stageId || event.source_stage || 'n/a').trim();
        title = `Agent ${roleLabel} started stage: ${stageLabel}`;
        icon = <TerminalSquare size={14} />;
        iconColorClass = 'text-purple-500';
        containerClass = 'border border-purple-500/20 rounded-md bg-slate-900/60 overflow-hidden text-sm';
    } else if (eventType === 'swarm_handoff') {
        const fromAgent = String(event.payload?.fromAgentTitle || event.payload?.fromAgentId || 'unknown').trim();
        const toAgent = String(event.payload?.toAgentTitle || event.payload?.toAgentId || roleLabel || 'unknown').trim();
        const toStage = String(event.payload?.toStageId || event.payload?.stageId || event.source_stage || 'n/a').trim();
        title = `Handoff: ${fromAgent} \u2192 ${toAgent} (stage: ${toStage})`;
        icon = <GitBranch size={14} />;
        iconColorClass = 'text-amber-400';
        containerClass = 'border border-amber-500/30 rounded-md bg-amber-500/10 overflow-hidden text-sm text-amber-200';
    } else if (eventType === 'tool.called') {
        const tool = String(event.payload?.tool || 'tool').trim();
        const summary = String(event.payload?.summary || '').trim();
        title = `Tool execution: ${tool} by ${roleLabel}`;
        bodyText = summary || '(No summary available)';
        icon = <Wrench size={14} />;
        iconColorClass = 'text-blue-500';
        containerClass = 'border border-blue-500/20 rounded-md bg-slate-950/80 overflow-hidden text-sm font-mono';
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
    }

    const hasBody = !!bodyText;

    return (
        <div className={containerClass}>
            <div 
                className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none bg-white/5 transition-colors duration-200 hover:bg-white/10" 
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
    if (!events || events.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 my-3">
            {events.map((event, i) => (
                <StreamEventCard key={event.event_id || `ev-${i}`} event={event} />
            ))}
        </div>
    );
};
