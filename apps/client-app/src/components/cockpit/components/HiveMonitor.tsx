import { type FC } from 'react';
import {
    Activity, Cpu, Layers, Bug, Zap,
    AlertTriangle, Radio, Rewind, Timer, Boxes
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Progress } from '../../ui/progress';
import { Separator } from '../../ui/separator';
import { useCockpit } from '../context/CockpitContext';
import { StreamRenderer } from '../StreamRenderer';
import { ObservabilityPanels } from '../ObservabilityPanels';
import './HiveMonitor.css';

export const HiveMonitor: FC = () => {
    const {
        swarmSummary,
        swarmWorkers,
        queueSnapshot,
        resourcePressure,
        dispatchLatencySummary,
        workerLifecycleTimeline,
        workerDebugRows,
        chatEventRenderMode,
        setChatEventRenderMode,
        replayEnabled,
        setReplayEnabled,
        replayPlaying,
        setReplayPlaying,
        replayIndex,
        replaySpeedMs,
        setReplaySpeedMs,
        replayVisibleEvents,
        activeEvents,
        selectedProject
    } = useCockpit();

    return (
        <aside className="w-80 border-l border-border/40 bg-sidebar/5 flex flex-col overflow-hidden font-sans relative">
            {/* Glossy Header */}
            <div className="h-14 px-5 border-b border-border/40 flex items-center bg-background/80 backdrop-blur-xl z-10">
                <Activity className="size-4 mr-3 text-primary animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">Hive Monitor</span>
                <div className="ml-auto flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Live</span>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-5 flex flex-col gap-8">
                    {/* Swarm Health Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="p-3.5 bg-card/40 border-border/50 shadow-sm transition-all hover:bg-card/60">
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Active Workers</span>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-black text-foreground tabular-nums leading-none tracking-tighter">{swarmSummary.workersTotal}</span>
                                    <Cpu className="size-5 text-primary opacity-30" />
                                </div>
                            </div>
                        </Card>
                        <Card className="p-3.5 bg-card/40 border-border/50 shadow-sm transition-all hover:bg-card/60">
                            <div className="flex flex-col gap-2">
                                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Queue Pressure</span>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-black text-amber-500 tabular-nums leading-none tracking-tighter">{swarmSummary.queuePressure}</span>
                                    <Layers className="size-5 text-amber-500 opacity-30" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-10 bg-secondary/20 p-1 rounded-xl border border-border/30">
                            <TabsTrigger value="overview" className="text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-lg transition-all">
                                <Zap className="size-3.5" />
                            </TabsTrigger>
                            <TabsTrigger value="queue" className="text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-lg transition-all">
                                <Boxes className="size-3.5" />
                            </TabsTrigger>
                            <TabsTrigger value="workers" className="text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-lg transition-all">
                                <Cpu className="size-3.5" />
                            </TabsTrigger>
                            <TabsTrigger value="debug" className="text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-lg transition-all">
                                <Bug className="size-3.5" />
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60">Resource Load</span>
                                    <Badge variant="outline" className={`h-4.5 px-2 text-[8px] font-black uppercase tracking-widest border-border/50 ${resourcePressure.className}`}>
                                        {resourcePressure.label}
                                    </Badge>
                                </div>
                                <div className="space-y-1.5">
                                    <Progress value={(swarmSummary.queuePressure / Math.max(1, swarmSummary.workersTotal)) * 50} className="h-1.5 bg-muted/20" />
                                    <div className="flex justify-between px-0.5">
                                        <span className="text-[8px] font-mono opacity-30">0%</span>
                                        <span className="text-[8px] font-mono opacity-30 text-amber-500">Peak Signal</span>
                                        <span className="text-[8px] font-mono opacity-30">100%</span>
                                    </div>
                                </div>

                                {dispatchLatencySummary.avgMs !== null && (
                                    <div className="flex items-center justify-between px-1 pt-2 border-t border-border/20">
                                        <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60">Dispatch Latency</span>
                                        <div className="flex items-center gap-2">
                                            {dispatchLatencySummary.warning && <AlertTriangle className="size-3 text-amber-500 animate-pulse" />}
                                            <span className={`text-[11px] font-black tabular-nums tracking-widest ${dispatchLatencySummary.warning ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {dispatchLatencySummary.avgMs}ms
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60">Lifecycle Events</span>
                                    <Timer className="size-3 text-muted-foreground/30" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    {workerLifecycleTimeline.slice(0, 5).map((ev: any) => (
                                        <div key={ev.event_id || ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/30 shadow-sm group hover:border-primary/30 transition-all">
                                            <div className="mt-0.5">
                                                {ev.event_type === 'worker.spawned' ? <Zap className="size-3.5 text-emerald-500" /> : <Activity className="size-3.5 text-blue-500" />}
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/90 leading-none">{ev.payload?.agentSlug || ev.agent_role}</span>
                                                    {ev.payload?.workerId && (
                                                        <Badge variant="outline" className="h-3.5 px-1 p-0 text-[8px] font-mono text-muted-foreground/40 uppercase tracking-tighter bg-muted/30">
                                                            @{String(ev.payload.workerId).slice(0, 6)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-bold text-muted-foreground/50 italic tracking-tight">{String(ev.event_type || '').replace('worker.', '').toUpperCase()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="queue" className="mt-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex flex-col gap-4">
                                {queueSnapshot.waiting.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 px-1 mb-1">
                                            <Radio className="size-3 text-amber-500 animate-pulse" />
                                            <span className="text-[9px] uppercase font-black tracking-widest text-amber-500/80">Pending Tasks</span>
                                        </div>
                                        {queueSnapshot.waiting.map((t: any) => (
                                            <div key={t.taskId} className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-2 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black font-mono text-amber-200 tracking-widest uppercase">{t.taskId}</span>
                                                    <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-widest text-amber-500 border-amber-500/30">Buffer</Badge>
                                                </div>
                                                <div className="h-px bg-amber-500/10 w-full" />
                                                <span className="text-[10px] text-amber-500/50 font-black uppercase tracking-tight truncate leading-none">{t.stageId}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 px-1 mb-1">
                                        <Activity className="size-3 text-primary opacity-50" />
                                        <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/60">Runtime Allocation</span>
                                    </div>
                                    {queueSnapshot.assigned.map((t: any) => (
                                        <div key={t.taskId} className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col gap-2 shadow-sm group hover:bg-primary/10 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black font-mono text-primary tracking-widest uppercase">{t.taskId}</span>
                                                <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-widest text-primary border-primary/30 animate-pulse">Running</Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">{t.agentSlug}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="workers" className="mt-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="flex flex-col gap-2.5">
                                {swarmWorkers.map((w) => (
                                    <div key={w.workerId} className="p-3.5 rounded-xl border border-border/40 bg-card/10 backdrop-blur-sm flex flex-col gap-3 group hover:border-primary/40 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`size-2 rounded-full border-2 border-background shadow-sm ${w.availabilityState === 'hot' ? 'bg-emerald-500 shadow-emerald-500/20 animate-pulse' : 'bg-muted-foreground/20'}`} />
                                                <span className="text-[11px] font-black uppercase tracking-widest text-foreground/90 leading-none">{w.agentSlug}</span>
                                            </div>
                                            <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums">@{w.workerId.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex items-center justify-between h-5">
                                            <Badge variant={w.enabled ? "outline" : "secondary"} className="text-[8px] h-full px-2 uppercase font-black tracking-widest border-border/50">
                                                {w.executionState.toUpperCase()}
                                            </Badge>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 italic">{w.availabilityState}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="debug" className="mt-6 animate-in fade-in slide-in-from-right-2 duration-300">
                            <ScrollArea className="h-[400px] -mx-1 px-1">
                                <div className="flex flex-col gap-0.5 pb-4">
                                    {workerDebugRows.map((row: any) => (
                                        <div key={row.event_id || row.id} className="text-[10px] py-1.5 px-2 font-mono border-b border-border/20 flex gap-3 hover:bg-muted/30 group transition-colors">
                                            <span className="text-[9px] opacity-30 font-bold tabular-nums shrink-0">{new Date(row.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                            <span className="text-primary font-black shrink-0 tracking-tighter">[{String(row.payload?.agentSlug || row.agent_role || 'sys').toUpperCase()}]</span>
                                            <span className="truncate flex-1 text-foreground/70 group-hover:text-foreground">{row.payload?.summary || row.payload?.message || row.event_type}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>

                    <Separator className="opacity-30" />

                    {/* Replay Controls & Feed */}
                    <div className="flex flex-col gap-6 pb-12">
                        <Card className="border-dashed border-border/40 bg-secondary/10 overflow-hidden shadow-none">
                            <div className="py-3 px-4 border-b border-border/30 flex items-center justify-between bg-secondary/20">
                                <div className="flex items-center gap-2.5">
                                    <Rewind className="size-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Session Replay</span>
                                </div>
                                <Badge variant="secondary" className="h-4.5 px-2 text-[8px] font-black uppercase tracking-widest bg-background/50 border-border/40">Admin</Badge>
                            </div>
                            <CardContent className="p-4 flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        className={`h-8 text-[9px] font-black uppercase tracking-widest transition-all ${chatEventRenderMode === 'raw' ? 'bg-amber-500/10 text-amber-500 border-amber-500/40 shadow-sm shadow-amber-500/10' : 'bg-background/20 opacity-60 hover:opacity-100'}`}
                                        onClick={() => setChatEventRenderMode('raw')}
                                    >
                                        Raw Logs
                                    </Button>
                                    <Button
                                        variant="outline" size="sm"
                                        className={`h-8 text-[9px] font-black uppercase tracking-widest transition-all ${chatEventRenderMode === 'humanized' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40 shadow-sm shadow-emerald-500/10' : 'bg-background/20 opacity-60 hover:opacity-100'}`}
                                        onClick={() => setChatEventRenderMode('humanized')}
                                    >
                                        Semantic
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline" size="sm" className="h-8 flex-1 text-[9px] font-black uppercase tracking-[0.2em] border-border/50 bg-background/20 hover:bg-background/40 active:scale-[0.98]"
                                        onClick={() => setReplayEnabled(!replayEnabled)}
                                    >
                                        {replayEnabled ? 'Terminate' : 'Init Replay'}
                                    </Button>
                                    {replayEnabled && (
                                        <Button
                                            variant="secondary" size="sm" className="h-8 flex-1 text-[9px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-[0.98]"
                                            onClick={() => setReplayPlaying(!replayPlaying)}
                                        >
                                            {replayPlaying ? 'Pause' : 'Play Stream'}
                                        </Button>
                                    )}
                                </div>

                                {replayEnabled && (
                                    <div className="flex flex-col gap-3 py-1 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Step Index</span>
                                            <span className="text-[10px] font-mono font-bold tabular-nums text-foreground/80">{replayIndex}/{activeEvents.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Playback Speed</span>
                                            <select
                                                className="bg-background border border-border/40 rounded px-1 text-[9px] font-black uppercase tracking-tighter outline-none cursor-pointer"
                                                value={replaySpeedMs}
                                                onChange={(e) => setReplaySpeedMs(Number(e.target.value))}
                                            >
                                                <option value={150}>Burst (150ms)</option>
                                                <option value={350}>Nominal (350ms)</option>
                                                <option value={700}>Extended (700ms)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2.5">
                                    <Radio className="size-3.5 text-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Runtime Feed</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <StreamRenderer events={replayVisibleEvents} />
                                <ObservabilityPanels events={replayVisibleEvents} selectedProject={selectedProject} />
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </aside>
    );
};

export default HiveMonitor;
