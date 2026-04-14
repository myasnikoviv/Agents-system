import React, { useRef, useEffect } from 'react';
import { Terminal, GitBranch, Folder, ShieldCheck, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '../../ui/separator';
import { ArtifactRenderer } from '../ArtifactRenderer';
import { useCockpit } from '../context/CockpitContext';
import { toRenderableMarkdown, parseMeetingViewPayload, parseMemoryInsightPayload } from '../utils/parsers';
import { ChatInputArea } from './ChatInputArea';

export const CommandInterface: React.FC = () => {
    const {
        messages,
        status,
        providerMessage,
        observability,
        currentTicketId,
        gitContext,
        scopeCardPinned,
        workScope,
        selectedScopeItemIds,
        setSelectedScopeItemIds,
        setScopeCardPinned,
        isAwaitingAgentReply,
        handleApprove,
        planeTicketUrl,
        isProcessing
    } = useCockpit();

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isAwaitingAgentReply]);

    return (
        <section className="flex-1 flex flex-col min-w-0 bg-background">
            <div className="flex items-center h-12 px-4 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                <Terminal className="size-4 mr-2 text-primary" />
                <span className="text-sm font-semibold">Command Interface</span>
                {providerMessage && (
                    <Badge variant="outline" className="ml-4 text-[10px] font-normal border-primary/20 bg-primary/5 text-primary">
                        {providerMessage}
                    </Badge>
                )}
            </div>

            <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-6">
                    {observability && (
                        <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
                            <CardHeader className="py-2 px-4 border-b border-primary/10 bg-primary/10">
                                <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-primary">Pipeline Observability</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Pipeline</span>
                                    <span className="text-sm font-mono truncate">{observability.pipeline}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Stage</span>
                                    <Badge variant="secondary" className="w-fit h-5 text-[10px]">{observability.stage}</Badge>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Next</span>
                                    <span className="text-sm truncate opacity-70 italic">{observability.nextStage}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Gates</span>
                                    <span className="text-sm font-medium">{observability.blockingGates}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Approval</span>
                                    <Badge variant={observability.approvalRequired ? "destructive" : "outline"} className="w-fit h-5 text-[10px]">
                                        {observability.approvalReason}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {(currentTicketId || gitContext) && (
                        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-lg bg-muted/30 border border-border/50">
                            {currentTicketId && (
                                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 h-7">
                                    <span className="text-[10px] font-bold opacity-50">TICKET:</span>
                                    {planeTicketUrl(currentTicketId) ? (
                                        <a href={planeTicketUrl(currentTicketId)!} target="_blank" rel="noreferrer" className="hover:underline">{currentTicketId}</a>
                                    ) : (
                                        currentTicketId
                                    )}
                                </Badge>
                            )}
                            {gitContext?.activeBranch && (
                                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 h-7 border-border/50 bg-background/50">
                                    <GitBranch className="size-3 opacity-50" />
                                    <span>{gitContext.activeBranch}</span>
                                </Badge>
                            )}
                            {gitContext?.worktreePath && (
                                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 h-7 border-border/50 bg-background/50">
                                    <Folder className="size-3 opacity-50" />
                                    <span className="truncate max-w-[200px]">{gitContext.worktreePath}</span>
                                </Badge>
                            )}
                            {gitContext?.preflightToken && (
                                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 h-7 border-border/50 bg-background/50">
                                    <ShieldCheck className="size-3 opacity-50" />
                                    <span className="truncate max-w-[150px]">{gitContext.preflightToken}</span>
                                </Badge>
                            )}
                        </div>
                    )}
                    
                    {scopeCardPinned && workScope.items.length > 0 && (
                        <Card className="shadow-lg border-primary/20 bg-background/80 backdrop-blur-sm">
                            <CardHeader className="py-2.5 px-4 flex-row items-center justify-between border-b border-border/50">
                                <div className="flex flex-col">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider">Execution Scope</CardTitle>
                                    <span className="text-[10px] text-muted-foreground">PM checklist: Sprint / Story / Task</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setScopeCardPinned(false)}>Unpin</Button>
                            </CardHeader>
                            <CardContent className="p-4 flex flex-col gap-4">
                                <div className="grid grid-cols-4 gap-2 border-b border-border/50 pb-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Total</span>
                                        <span className="text-lg font-bold">{workScope.statusSummary.total}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-emerald-500 uppercase font-medium">Done</span>
                                        <span className="text-lg font-bold text-emerald-500">{workScope.statusSummary.done}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-amber-500 uppercase font-medium">In Progress</span>
                                        <span className="text-lg font-bold text-amber-500">{workScope.statusSummary.inProgress}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Todo</span>
                                        <span className="text-lg font-bold">{workScope.statusSummary.todo}</span>
                                    </div>
                                </div>
                                <ScrollArea className="h-48">
                                    <div className="flex flex-col gap-1.5 pr-3">
                                        {workScope.items.slice(0, 50).map((it) => {
                                            const checked = selectedScopeItemIds.includes(it.id);
                                            return (
                                                <label key={`chat-scope-${it.id}`} className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors group">
                                                    <div className={`mt-0.5 size-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary shadow-sm shadow-primary/20' : 'border-border group-hover:border-primary/50'}`}>
                                                        {checked && <div className="size-1.5 rounded-full bg-primary-foreground" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={checked}
                                                        onChange={() =>
                                                            setSelectedScopeItemIds((prev) =>
                                                                checked ? prev.filter((id) => id !== it.id) : [...prev, it.id]
                                                            )
                                                        }
                                                    />
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono opacity-60">{it.key}</Badge>
                                                            <span className={`text-[11px] font-medium leading-tight ${checked ? 'line-through text-muted-foreground' : ''}`}>{it.name}</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}

                    {!scopeCardPinned && workScope.items.length > 0 && (
                        <Button variant="outline" className="w-full dashed border-border/50 h-9 gap-2 text-xs" onClick={() => setScopeCardPinned(true)}>
                            <Plus className="size-3.5" />
                            Pin Scope Checklist
                        </Button>
                    )}

                    <div className="flex flex-col gap-8 pb-32">
                        {messages.length === 0 && status === 'idle' ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-40">
                                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                                    <Terminal className="size-8" />
                                </div>
                                <p className="text-sm font-medium italic max-w-xs">
                                    No tasks yet. How can the Swarm assist you today?
                                </p>
                            </div>
                        ) : (
                            messages.map((m) => {
                                const meeting = parseMeetingViewPayload(m.content);
                                const insight = parseMemoryInsightPayload(m.content);
                                
                                return (
                                    <div key={m.id} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                {m.role === 'user' ? 'Operator' : 'Swarm'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/50">
                                                {m.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className={`relative max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            m.role === 'user' 
                                            ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                            : 'bg-muted border border-border/50 text-foreground rounded-tl-none'
                                        }`}>
                                            {meeting && (
                                                <div className="meeting-card mb-4 bg-background/50 rounded-xl p-3 border border-border/50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <strong className="text-xs">{meeting.title || 'Meeting'}</strong>
                                                        <Badge variant="secondary" className="text-[9px]">{meeting.turns.length} turns</Badge>
                                                    </div>
                                                    <div className="flex flex-col gap-3">
                                                        {meeting.turns.map((turn, idx) => (
                                                            <div key={`${m.id}-turn-${idx}`} className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 opacity-60">
                                                                    <span className="text-[9px] font-bold uppercase">{turn.role}</span>
                                                                    {turn.round && <span className="text-[9px]">Round {turn.round}</span>}
                                                                </div>
                                                                <div className="text-[11px] leading-normal">{turn.text}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {meeting.decision && (
                                                        <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                                            <span className="text-[9px] font-bold text-emerald-500 uppercase block mb-1">Decision</span>
                                                            <div className="text-[11px] text-emerald-200">{meeting.decision}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {insight && (
                                                <div className="memory-insight-card mb-4 bg-background/50 rounded-xl p-3 border border-border/50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <strong className="text-xs">{insight.title || 'Related Memory'}</strong>
                                                        <Badge variant="secondary" className="text-[9px]">{insight.items.length} items</Badge>
                                                    </div>
                                                    <div className="flex flex-col gap-4">
                                                        {insight.items.map((it) => (
                                                            <div key={`${m.id}-memory-${it.id}`} className="flex flex-col gap-1.5 pt-3 first:pt-0 border-t border-border/30 first:border-0">
                                                                <div className="text-[11px] leading-relaxed">{it.text}</div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] opacity-40 font-mono italic">{it.id}</span>
                                                                    {it.sourceLabel && it.sourceHref ? (
                                                                        <a href={it.sourceHref} target="_blank" rel="noreferrer" className="text-[9px] text-primary hover:underline">
                                                                            {it.sourceLabel}
                                                                        </a>
                                                                    ) : it.sourceLabel ? (
                                                                        <span className="text-[9px] opacity-50 italic">{it.sourceLabel}</span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="chat-markdown">
                                                <ArtifactRenderer content={toRenderableMarkdown(m.content)} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        
                        {isAwaitingAgentReply && (
                            <div className="flex flex-col items-start gap-2 ml-4">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Swarm</span>
                                </div>
                                <div className="bg-muted/30 border border-dashed border-border/80 px-4 py-3 rounded-2xl rounded-tl-none">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="text-xs italic">Agent is thinking</span>
                                        <span className="flex gap-1">
                                            <span className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                                            <span className="w-1 h-1 rounded-full bg-primary/40 animate-pulse delay-75" />
                                            <span className="w-1 h-1 rounded-full bg-primary/40 animate-pulse delay-150" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {status === 'awaiting_approval' && (
                            <Card className="border-destructive/20 bg-destructive/5 p-4 flex flex-col gap-3">
                                <p className="text-xs font-medium">Agent is waiting for your approval to proceed to the next stage.</p>
                                <Button size="sm" onClick={handleApprove} disabled={isProcessing}>
                                    {isProcessing ? 'Processing...' : 'Approve & Continue'}
                                </Button>
                            </Card>
                        )}
                        
                        <div ref={scrollRef} />
                    </div>
                </div>
            </ScrollArea>

            <ChatInputArea />
        </section>
    );
};
