import { type FC } from 'react';
import { 
    Activity, Cpu, Layers, Bug, Zap, 
    AlertTriangle, Radio, Rewind 
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../ui/card';
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
        <aside className="w-80 border-l border-border/50 bg-sidebar/5 flex flex-col overflow-hidden">
            <div className="h-12 px-4 border-b border-border/50 flex items-center bg-background/50">
                <Activity className="size-4 mr-2 text-primary" />
                <span className="text-sm font-semibold">Hive Monitor</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 flex flex-col gap-6">
                    {/* Swarm Health Summary */}
                    <div className="grid grid-cols-2 gap-2">
                        <Card className="p-3 bg-background/40">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Workers</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold font-mono">{swarmSummary.workersTotal}</span>
                                    <Cpu className="size-4 text-primary opacity-50" />
                                </div>
                            </div>
                        </Card>
                        <Card className="p-3 bg-background/40">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Queue</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold font-mono">{swarmSummary.queuePressure}</span>
                                    <Layers className="size-4 text-amber-500 opacity-50" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-9 bg-muted/30">
                            <TabsTrigger value="overview" className="text-[10px]"><Zap className="size-3" /></TabsTrigger>
                            <TabsTrigger value="queue" className="text-[10px]"><Layers className="size-3" /></TabsTrigger>
                            <TabsTrigger value="workers" className="text-[10px]"><Cpu className="size-3" /></TabsTrigger>
                            <TabsTrigger value="debug" className="text-[10px]"><Bug className="size-3" /></TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Resource Pressure</span>
                                    <Badge variant="outline" className={`h-4 text-[9px] ${resourcePressure.className}`}>
                                        {resourcePressure.label}
                                    </Badge>
                                </div>
                                <Progress value={(swarmSummary.queuePressure / Math.max(1, swarmSummary.workersTotal)) * 50} className="h-1" />
                                
                                {dispatchLatencySummary.avgMs !== null && (
                                    <div className="flex items-center justify-between px-1 pt-1">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Dispatch Latency</span>
                                        <div className="flex items-center gap-1.5">
                                            {dispatchLatencySummary.warning && <AlertTriangle className="size-3 text-amber-500" />}
                                            <span className={`text-xs font-mono font-bold ${dispatchLatencySummary.warning ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {dispatchLatencySummary.avgMs}ms
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator className="opacity-50" />

                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground px-1">Lifecycle Events</span>
                                <div className="flex flex-col gap-1.5">
                                    {workerLifecycleTimeline.map((ev: any) => (
                                        <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/10">
                                            <div className="mt-1">
                                                {ev.type === 'worker.spawned' ? <Zap className="size-3 text-emerald-500" /> : <Activity className="size-3 text-blue-500" />}
                                            </div>
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-bold text-foreground/80">{ev.agentSlug}</span>
                                                    <span className="text-[8px] text-muted-foreground font-mono">@{ev.workerId.slice(0, 6)}</span>
                                                </div>
                                                <span className="text-[8px] text-muted-foreground italic truncate">{ev.type.replace('worker.', '')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="queue" className="mt-4">
                            <div className="flex flex-col gap-3">
                                {queueSnapshot.waiting.length > 0 && (
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] uppercase font-bold text-amber-500 px-1 flex items-center gap-1.5">
                                            <Radio className="size-3 animate-pulse" /> Pending Tasks
                                        </span>
                                        {queueSnapshot.waiting.map((t: any) => (
                                            <div key={t.taskId} className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold font-mono text-amber-200">{t.taskId}</span>
                                                    <Badge variant="outline" className="h-3.5 text-[7px] text-amber-500 border-amber-500/30">WAITING</Badge>
                                                </div>
                                                <span className="text-[9px] text-amber-500/60 font-medium tracking-tight truncate">{t.stageId}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {queueSnapshot.assigned.map((t: any) => (
                                    <div key={t.taskId} className="p-2 rounded-lg border border-primary/20 bg-primary/5 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold font-mono text-primary">{t.taskId}</span>
                                            <Badge variant="outline" className="h-3.5 text-[7px] text-primary border-primary/30">RUNNING</Badge>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-bold opacity-60">{t.agentSlug}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="workers" className="mt-4">
                            <div className="flex flex-col gap-2">
                                {swarmWorkers.map((w) => (
                                    <div key={w.workerId} className="p-2 rounded-lg border border-border/50 bg-background/50 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`size-1.5 rounded-full ${w.availabilityState === 'hot' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                                <span className="text-[10px] font-bold">{w.agentSlug}</span>
                                            </div>
                                            <span className="text-[8px] font-mono opacity-40">@{w.workerId.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex items-center justify-between h-4">
                                            <Badge variant={w.enabled ? "outline" : "secondary"} className="text-[8px] h-full px-1.5 uppercase font-bold">
                                                {w.executionState}
                                            </Badge>
                                            <span className="text-[9px] text-muted-foreground">{w.availabilityState}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="debug" className="mt-4">
                            <div className="flex flex-col gap-1">
                                {workerDebugRows.map((row: any) => (
                                    <div key={row.id} className="text-[9px] py-1 px-1.5 font-mono border-b border-border/30 flex gap-2 hover:bg-muted/30">
                                        <span className="opacity-30">{new Date(row.at).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
                                        <span className="text-primary/70">[{row.agentSlug}]</span>
                                        <span className="truncate flex-1">{row.summary || row.type}</span>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Separator className="opacity-50" />

                    {/* Replay Controls & Feed */}
                    <div className="flex flex-col gap-4 pb-8">
                        <Card className="border-dashed border-border/50 bg-muted/5 overflow-hidden">
                            <CardHeader className="py-2.5 px-3 border-b border-border/50 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Rewind className="size-3.5 text-muted-foreground" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Session Replay</span>
                                </div>
                                <Badge variant="secondary" className="h-4 px-1 text-[8px] font-normal opacity-60">ADMIN</Badge>
                            </CardHeader>
                            <CardContent className="p-3 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        variant="outline" size="sm" 
                                        className={`h-7 text-[9px] uppercase font-bold ${chatEventRenderMode === 'raw' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : ''}`}
                                        onClick={() => setChatEventRenderMode('raw')}
                                    >
                                        Raw
                                    </Button>
                                    <Button 
                                        variant="outline" size="sm" 
                                        className={`h-7 text-[9px] uppercase font-bold ${chatEventRenderMode === 'humanized' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : ''}`}
                                        onClick={() => setChatEventRenderMode('humanized')}
                                    >
                                        Human
                                    </Button>
                                </div>
                                
                                <div className="flex items-center gap-2 pt-1">
                                    <Button 
                                        variant="outline" size="sm" className="h-7 px-0 flex-1 text-[9px] uppercase font-bold"
                                        onClick={() => setReplayEnabled(!replayEnabled)}
                                    >
                                        {replayEnabled ? 'Disable' : 'Enable'}
                                    </Button>
                                    {replayEnabled && (
                                        <Button 
                                            variant="secondary" size="sm" className="h-7 px-0 flex-1 text-[9px] uppercase font-bold"
                                            onClick={() => setReplayPlaying(!replayPlaying)}
                                        >
                                            {replayPlaying ? 'Pause' : 'Play'}
                                        </Button>
                                    )}
                                </div>

                                {replayEnabled && (
                                    <div className="flex flex-col gap-2 pt-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-muted-foreground font-mono">Step: {replayIndex}/{activeEvents.length}</span>
                                            <select 
                                                className="bg-transparent text-[9px] font-mono outline-none"
                                                value={replaySpeedMs}
                                                onChange={(e) => setReplaySpeedMs(Number(e.target.value))}
                                            >
                                                <option value={150}>FAST</option>
                                                <option value={350}>NORM</option>
                                                <option value={700}>SLOW</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-2 p-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Radio className="size-3 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Runtime Feed</span>
                            </div>
                            <StreamRenderer events={replayVisibleEvents} />
                            <ObservabilityPanels events={replayVisibleEvents} selectedProject={selectedProject} />
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </aside>
    );
};
