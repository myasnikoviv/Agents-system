import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Mic, Send, Square, Cpu, Activity, LayoutDashboard, Terminal, Settings, PanelLeftClose, PanelLeftOpen, Globe2, ChevronDown, Plus, PencilLine, Folder, FolderPlus, Laptop, ShieldCheck, GitBranch, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArtifactRenderer } from './ArtifactRenderer';
import { apiUrl, fetchJsonSafe } from '../../lib/http';
import { StreamRenderer, type RuntimeEvent } from './StreamRenderer';
import { ObservabilityPanels } from './ObservabilityPanels';

// UI Kit Imports
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

import './CockpitPage.css';
const CHAT_EVENT_RENDER_MODE_KEY = 'cockpit.chat.event.render.mode.v1';

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

interface ObservabilityState {
    pipeline: string;
    stage: string;
    nextStage: string;
    blockingGates: string;
    approvalRequired: boolean;
    approvalReason: string;
}

interface GitContext {
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
}
interface RuntimeFooterState {
    executionTarget: 'local' | 'remote';
    accessPolicy: 'full-access' | 'sandbox';
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
}
interface CanonicalSseEvent {
    id?: string;
    type?: string;
    runId?: string;
    chainId?: string;
    projectId?: string;
    timestamp?: number | string;
    actor?: { id?: string; role?: string };
    payload?: Record<string, any>;
    [key: string]: any;
}

interface CatalogState {
    agents: string[];
    pipelines: string[];
    skills: string[];
}

interface RailProject {
    id: string;
    label: string;
    worktreePath?: string;
    agentContextPath?: string;
    repositoryUrl?: string;
    onboardingMode?: 'local' | 'repository';
    onboardingAuthMode?: 'none' | 'oauth' | 'pat';
    onboardingBootstrapMode?: 'none' | 'auto-template' | 'read-only';
    onboardingReadOnly?: boolean;
}
interface RailThread {
    id: string;
    label: string;
    updatedAt: string;
}
interface PlaneProjectOption {
    id: string;
    name: string;
    identifier: string;
}
interface AgentRegistryEntry {
    slug: string;
    title: string;
    callsign: string;
    sourcePath?: string;
    available?: boolean;
}
type AgentLiveStatus = 'active' | 'standby' | 'unavailable';
interface AgentRuntimeStatus {
    slug: string;
    title: string;
    callsign: string;
    status: AgentLiveStatus;
    currentStage: string;
    currentTask: string;
    currentIssue: string;
    threadId: string;
    lastUpdated: string;
    delegatedFrom?: string | null;
    isPaused?: boolean;
}
interface WorkerHealthRow {
    projectId: string;
    agentSlug: string;
    workerId: string;
    enabled: boolean;
    availabilityState: 'hot' | 'cold';
    executionState: 'active' | 'standby';
    rawLifecycleState: string;
    heartbeatFreshness: 'fresh' | 'stale' | 'dead';
    heartbeatAgeMs: number;
    lastHeartbeatAt: number;
    isPaused?: boolean;
    assignedTask?: {
        taskId: string;
        stageId?: string;
        pipelineId?: string;
        runId: string;
    } | null;
}
interface SwarmSummaryState {
    workersTotal: number;
    activeWorkers: number;
    standbyWorkers: number;
    unhealthyWorkers: number;
    queuePressure: number;
}
interface ProjectSwitchFeedback {
    fromProjectId: string;
    toProjectId: string;
    switching: boolean;
    startedAtMs: number;
    resolvedAtMs: number | null;
    warmupMs: number | null;
    previousWorkers: number;
    currentWorkers: number;
    previousHot: number;
    currentHot: number;
    spawned: number;
    demoted: number;
    coldWorkers: number;
}
interface QueueTaskSnapshot {
    taskId: string;
    stageId: string;
    agentSlug: string;
    status: 'pending' | 'assigned' | 'completed';
    queuedAt: number;
    assignedAt: number | null;
    updatedAt: number;
}
interface PersistedThreadMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: string;
}

type PromptTokenKind = 'pipeline' | 'agent' | 'skill';
interface PromptToken {
    kind: PromptTokenKind;
    value: string;
}
interface ScopeEntity {
    id: string;
    key: string;
    name: string;
    stateId: string;
    completedAt?: string;
}
interface UploadedAttachment {
    id: string;
    originalName: string;
    relativePath: string;
    mimeType: string;
    size: number;
    createdAt: string;
}
interface WorkScopeState {
    cycles: Array<{ id: string; name: string }>;
    stories: ScopeEntity[];
    tasks: ScopeEntity[];
    items: ScopeEntity[];
    selected: { cycleId: string; storyId: string };
    statusSummary: { total: number; done: number; inProgress: number; todo: number };
}
interface MeetingTurnView {
    role: string;
    round?: number;
    text: string;
}
interface MeetingViewPayload {
    title?: string;
    turns: MeetingTurnView[];
    decision?: string;
}
interface MemoryInsightItem {
    id: string;
    text: string;
    sourceLabel?: string;
    sourceHref?: string;
}
interface MemoryInsightPayload {
    title?: string;
    items: MemoryInsightItem[];
}
interface MetaAutocompleteState {
    open: boolean;
    kind: PromptTokenKind | null;
    query: string;
    rangeStart: number;
    rangeEnd: number;
    selectedIndex: number;
    suggestions: string[];
}

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        length: number;
        [key: number]: {
            isFinal: boolean;
            [key: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start: () => void;
    stop: () => void;
}

interface DirectoryPickerHandleLike {
    name?: string;
    path?: string;
    fullPath?: string;
}
interface DirectoryPickerWindow extends Window {
    showDirectoryPicker?: () => Promise<DirectoryPickerHandleLike>;
}

type RuntimeProvider = 'claude-cli' | 'codex-cli' | 'openhands-sdk';
type ChatEventRenderMode = 'humanized' | 'raw' | 'both';

const toRenderableMarkdown = (raw: string): string =>
    String(raw || '').replace(
        /<execute_tool>\s*([\s\S]*?)\s*<\/execute_tool>/gi,
        (_match, inner) => `\n\`\`\`bash\n${String(inner || '').trim()}\n\`\`\`\n`
    );

const parseMeetingViewPayload = (raw: string): MeetingViewPayload | null => {
    const content = String(raw || '');
    if (!content.trim()) return null;

    // Preferred explicit payload marker:
    // MEETING_VIEW: {"title":"...","turns":[...],"decision":"..."}
    const markerIdx = content.indexOf('MEETING_VIEW:');
    if (markerIdx >= 0) {
        const jsonPart = content.slice(markerIdx + 'MEETING_VIEW:'.length).trim();
        try {
            const parsed = JSON.parse(jsonPart) as MeetingViewPayload;
            if (Array.isArray(parsed.turns) && parsed.turns.length > 0) {
                return {
                    title: parsed.title || 'Meeting',
                    turns: parsed.turns.map((t) => ({
                        role: String(t.role || 'agent'),
                        round: Number.isFinite(Number(t.round)) ? Number(t.round) : undefined,
                        text: String(t.text || ''),
                    })),
                    decision: parsed.decision ? String(parsed.decision) : undefined,
                };
            }
        } catch {
            // ignore malformed marker payload
        }
    }

    // Fallback parser for plain-text meeting transcript:
    // Round 1 | architect: ...
    // Decision: ...
    const turns: MeetingTurnView[] = [];
    let decision: string | undefined;
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        const decisionMatch = line.match(/^decision\s*:\s*(.+)$/i);
        if (decisionMatch) {
            decision = decisionMatch[1].trim();
            continue;
        }
        const turnMatch = line.match(/^round\s*(\d+)\s*[:|\-]?\s*([a-z0-9_\- ]+)\s*:\s*(.+)$/i);
        if (turnMatch) {
            turns.push({
                round: Number(turnMatch[1]),
                role: turnMatch[2].trim(),
                text: turnMatch[3].trim(),
            });
        }
    }
    if (turns.length === 0 && !decision) return null;
    return {
        title: 'Meeting',
        turns,
        decision,
    };
};

const parseMemoryInsightPayload = (raw: string): MemoryInsightPayload | null => {
    const content = String(raw || '');
    if (!content.trim()) return null;

    // Preferred marker:
    // MEMORY_INSIGHT: {"items":[{"id":"...","text":"...","sourceLabel":"...","sourceHref":"..."}]}
    const markerIdx = content.indexOf('MEMORY_INSIGHT:');
    if (markerIdx >= 0) {
        const jsonPart = content.slice(markerIdx + 'MEMORY_INSIGHT:'.length).trim();
        try {
            const parsed = JSON.parse(jsonPart) as MemoryInsightPayload;
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                return {
                    title: parsed.title || 'Related Memory',
                    items: parsed.items.map((it) => ({
                        id: String(it.id || ''),
                        text: String(it.text || ''),
                        sourceLabel: it.sourceLabel ? String(it.sourceLabel) : undefined,
                        sourceHref: it.sourceHref ? String(it.sourceHref) : undefined,
                    })),
                };
            }
        } catch {
            // ignore malformed payload
        }
    }

    // Fallback plain-text parser:
    // Related memory:
    // - [mem-1] Some insight (source: docs/path.md)
    const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
    const startIdx = lines.findIndex((line) => /^related memory\s*:/i.test(line));
    if (startIdx < 0) return null;
    const items: MemoryInsightItem[] = [];
    for (let i = startIdx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line.startsWith('-')) break;
        const stripped = line.replace(/^-+\s*/, '');
        const match = stripped.match(/^\[([^\]]+)\]\s*(.+?)(?:\s*\(source:\s*([^)]+)\))?$/i);
        if (match) {
            const href = match[3] && /^(https?:\/\/|\/)/i.test(match[3].trim()) ? match[3].trim() : undefined;
            items.push({
                id: match[1].trim(),
                text: match[2].trim(),
                sourceLabel: match[3] ? match[3].trim() : undefined,
                sourceHref: href,
            });
        } else {
            items.push({
                id: `item-${i}`,
                text: stripped,
            });
        }
    }
    if (items.length === 0) return null;
    return { title: 'Related Memory', items };
};

export function CockpitPage() {
    const navigate = useNavigate();
    const mode = 'multiple_agents' as const;
    const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>({});
    const [chatEventRenderMode, setChatEventRenderMode] = useState<ChatEventRenderMode>(() => {
        const stored = localStorage.getItem(CHAT_EVENT_RENDER_MODE_KEY);
        if (stored === 'humanized' || stored === 'raw' || stored === 'both') return stored;
        return 'humanized';
    });
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [eventsByThread, setEventsByThread] = useState<Record<string, RuntimeEvent[]>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingAgentReply, setIsAwaitingAgentReply] = useState(false);
    const [ghostText, setGhostText] = useState('');
    const [voiceLang, setVoiceLang] = useState<'auto' | 'uk' | 'en'>('auto');
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [observability, setObservability] = useState<ObservabilityState | null>(null);
    const [gitContext, setGitContext] = useState<GitContext | null>(null);
    const [catalog, setCatalog] = useState<CatalogState>({ agents: [], pipelines: [], skills: [] });
    const [agentRegistry, setAgentRegistry] = useState<AgentRegistryEntry[]>([]);
    const [agentRuntime, setAgentRuntime] = useState<Record<string, AgentRuntimeStatus>>({});
    const [swarmSummary] = useState<SwarmSummaryState>({
        workersTotal: 0,
        activeWorkers: 0,
        standbyWorkers: 0,
        unhealthyWorkers: 0,
        queuePressure: 0,
    });
    const [swarmWorkers] = useState<WorkerHealthRow[]>([]);
    const [projectSwitchFeedback, setProjectSwitchFeedback] = useState<ProjectSwitchFeedback | null>(null);

    const [selectedProvider, setSelectedProvider] = useState<RuntimeProvider>('claude-cli');
    const [selectedModel, setSelectedModel] = useState('auto');
    const [providerModelPresets, setProviderModelPresets] = useState<Record<RuntimeProvider, string[]>>({
        'claude-cli': ['auto'],
        'codex-cli': ['auto'],
        'openhands-sdk': ['auto'],
    });
    const [providerMessage, setProviderMessage] = useState<string | null>(null);

    const [runtimePickerOpen, setRuntimePickerOpen] = useState<'provider' | 'model' | 'voice' | 'target' | 'access' | 'branch' | null>(null);
    const [showCatalogPicker, setShowCatalogPicker] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [promptTokens, setPromptTokens] = useState<PromptToken[]>([]);
    const [metaAutocomplete, setMetaAutocomplete] = useState<MetaAutocompleteState>({
        open: false,
        kind: null,
        query: '',
        rangeStart: 0,
        rangeEnd: 0,
        selectedIndex: 0,
        suggestions: [],
    });
    const [selectedScopeItemIds, setSelectedScopeItemIds] = useState<string[]>([]);
    const [scopeCardPinned, setScopeCardPinned] = useState(true);
    const [railCollapsed, setRailCollapsed] = useState(false);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedThread, setSelectedThread] = useState('');
    const [railProjects, setRailProjects] = useState<RailProject[]>([]);
    const [railThreadsByProject, setRailThreadsByProject] = useState<Record<string, RailThread[]>>({});
    const [runtimeFooter, setRuntimeFooter] = useState<RuntimeFooterState>({
        executionTarget: 'local',
        accessPolicy: 'full-access',
        activeBranch: 'main',
        worktreePath: '',
        preflightToken: null,
    });
    const [workScope, setWorkScope] = useState<WorkScopeState>({
        cycles: [],
        stories: [],
        tasks: [],
        items: [],
        selected: { cycleId: '', storyId: '' },
        statusSummary: { total: 0, done: 0, inProgress: 0, todo: 0 },
    });
    const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
    const [replayEnabled, setReplayEnabled] = useState(false);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replaySpeedMs, setReplaySpeedMs] = useState(350);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectDirectory, setProjectDirectory] = useState('');
    const [projectAgentContextDirectory, setProjectAgentContextDirectory] = useState('');
    const [projectOnboardingMode, setProjectOnboardingMode] = useState<'local' | 'repository'>('repository');
    const [projectRepositoryUrl, setProjectRepositoryUrl] = useState('');
    const [projectRepositoryAuthMode, setProjectRepositoryAuthMode] = useState<'none' | 'oauth' | 'pat'>('oauth');
    const [projectBootstrapMode, setProjectBootstrapMode] = useState<'none' | 'auto-template' | 'read-only'>('read-only');
    const [planeProjectOptions, setPlaneProjectOptions] = useState<PlaneProjectOption[]>([]);
    const [selectedPlaneProjectId, setSelectedPlaneProjectId] = useState('');
    const [createPlaneProject, setCreatePlaneProject] = useState(false);
    const [isLoadingPlaneProjects, setIsLoadingPlaneProjects] = useState(false);
    const [planeProjectsConfigured, setPlaneProjectsConfigured] = useState<boolean | null>(null);
    const [isChainModalOpen, setIsChainModalOpen] = useState(false);
    const [newChainLabel, setNewChainLabel] = useState('');
    const [newChainScope, setNewChainScope] = useState<'current' | 'unbound'>('current');
    const activeThreadKey = selectedThread || currentThreadId || '__unbound_thread__';
    const messages = messagesByThread[activeThreadKey] || [];
    const activeEvents = eventsByThread[activeThreadKey] || [];
    const agentRegistryRef = useRef<AgentRegistryEntry[]>([]);
    const previousProjectRef = useRef<string>('');

    const resolveAgentSlug = (rawRole: string): string => {
        const probe = String(rawRole || '').trim().toLowerCase();
        if (!probe) return '';
        const registry = agentRegistryRef.current;
        const exact = registry.find((agent) => agent.slug.toLowerCase() === probe);
        if (exact) return exact.slug;
        const byTitle = registry.find((agent) => agent.title.toLowerCase() === probe);
        if (byTitle) return byTitle.slug;
        const byCallsign = registry.find((agent) => agent.callsign.toLowerCase() === probe);
        if (byCallsign) return byCallsign.slug;
        return probe;
    };

    useEffect(() => {
        localStorage.setItem(CHAT_EVENT_RENDER_MODE_KEY, chatEventRenderMode);
    }, [chatEventRenderMode]);

    const formatRawEventForChat = (event: RuntimeEvent): string | null => {
        const eventType = String(event.event_type || event.type || '').trim();
        if (!eventType) return null;
        const role = String(event.agent_role || event.actor?.role || event.actor?.id || 'system').trim();
        const stageRaw = String(event.payload?.stageId || event.source_stage || '').trim();
        const stageTitleRaw = String(event.payload?.stageTitle || event.payload?.toStageTitle || '').trim();
        const stageLabel = stageTitleRaw || stageRaw || 'n/a';
        const payloadPreview = String(
            event.payload?.message ||
            event.payload?.summary ||
            event.payload?.detail ||
            event.payload?.reason ||
            event.payload?.status ||
            event.payload?.content ||
            ''
        ).trim();
        const lines = [
            `event: \`${eventType}\``,
            `agent: \`${role}\``,
            `stage: \`${stageLabel}\``,
        ];
        if (payloadPreview) lines.push(`payload: ${payloadPreview.slice(0, 280)}`);
        return lines.join('\n');
    };

    const resolveAgentDisplay = (slug: string) => {
        const registryAgent = agentRegistryRef.current.find((agent) => agent.slug === slug);
        return {
            title: registryAgent?.title || slug,
            callsign: registryAgent?.callsign || registryAgent?.title || slug,
        };
    };

    const sanitizeTaskText = (value: string): string => {
        const trimmed = String(value || '').trim();
        if (!trimmed) return 'n/a';
        const compact = trimmed.replace(/\s+/g, ' ');
        if (compact.length > 120) {
            return `${compact.slice(0, 117)}...`;
        }
        return compact;
    };

    const formatHeartbeatTimestamp = (ts: number): string => {
        if (!Number.isFinite(ts) || ts <= 0) return 'n/a';
        return new Date(ts).toLocaleTimeString();
    };

    const agentStatusRows = useMemo<AgentRuntimeStatus[]>(() => {
        return agentRegistry.map((agent) => {
            const current = agentRuntime[agent.slug];
            return {
                slug: agent.slug,
                title: agent.title,
                callsign: agent.callsign,
                status: agent.available === false ? 'unavailable' : (current?.status || 'standby'),
                currentStage: current?.currentStage || 'n/a',
                currentTask: current?.currentTask || 'n/a',
                currentIssue: current?.currentIssue || 'n/a',
                threadId: current?.threadId || 'n/a',
                lastUpdated: current?.lastUpdated || '',
            };
        });
    }, [agentRegistry, agentRuntime]);

    const sortedAgentStatusRows = useMemo<AgentRuntimeStatus[]>(() => {
        const priority: Record<AgentLiveStatus, number> = {
            unavailable: 0,
            active: 1,
            standby: 2,
        };
        return [...agentStatusRows].sort((a, b) => {
            const byStatus = priority[a.status] - priority[b.status];
            if (byStatus !== 0) return byStatus;
            return (a.callsign || a.title || a.slug).localeCompare(b.callsign || b.title || b.slug, 'uk');
        });
    }, [agentStatusRows]);

    const projectScopedWorkers = useMemo<WorkerHealthRow[]>(() => {
        if (!selectedProject) return swarmWorkers;
        return swarmWorkers.filter((w) => String(w.projectId || '').trim() === selectedProject);
    }, [swarmWorkers, selectedProject]);

    const projectRosterSummary = useMemo(() => {
        const uniqueAgents = new Set<string>();
        let enabled = 0;
        let hot = 0;
        let cold = 0;
        for (const worker of projectScopedWorkers) {
            uniqueAgents.add(String(worker.agentSlug || '').trim());
            if (worker.enabled) enabled += 1;
            if (worker.availabilityState === 'hot') hot += 1;
            if (worker.availabilityState === 'cold') cold += 1;
        }
        return {
            uniqueAgents: uniqueAgents.size,
            enabled,
            hot,
            cold,
            totalWorkers: projectScopedWorkers.length,
        };
    }, [projectScopedWorkers]);

    const queueSnapshot = useMemo(() => {
        const tasks = new Map<string, QueueTaskSnapshot>();
        for (const event of activeEvents) {
            const eventType = String(event.event_type || event.type || '').trim();
            if (eventType !== 'task.queued' && eventType !== 'task.dispatched' && eventType !== 'swarm_stage_completed') continue;
            const taskId = String(event.payload?.taskId || '').trim();
            if (!taskId) continue;
            const ts = Number(new Date(String(event.timestamp || Date.now())).getTime());
            const existing = tasks.get(taskId);
            const nextStatus: QueueTaskSnapshot['status'] =
                eventType === 'task.queued'
                    ? 'pending'
                    : eventType === 'task.dispatched'
                        ? 'assigned'
                        : 'completed';
            tasks.set(taskId, {
                taskId,
                stageId: String(event.payload?.stageId || existing?.stageId || 'n/a').trim(),
                agentSlug: String(event.payload?.agentSlug || event.actor?.id || existing?.agentSlug || 'unknown').trim(),
                status: nextStatus,
                queuedAt: existing?.queuedAt || ts,
                assignedAt:
                    nextStatus === 'assigned'
                        ? ts
                        : existing?.assignedAt || null,
                updatedAt: ts,
            });
        }
        const all = Array.from(tasks.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        const waiting = all.filter((t) => t.status === 'pending');
        const assigned = all.filter((t) => t.status === 'assigned');
        const completed = all.filter((t) => t.status === 'completed');
        return {
            waiting,
            assigned,
            completed,
            totalTracked: all.length,
            queueLength: waiting.length,
        };
    }, [activeEvents]);

    const taskWorkerMapping = useMemo(() => {
        const rows = projectScopedWorkers
            .filter((w) => w.assignedTask?.taskId)
            .map((w) => ({
                taskId: String(w.assignedTask?.taskId || 'n/a').trim(),
                stageId: String(w.assignedTask?.stageId || 'n/a').trim(),
                workerId: String(w.workerId || 'n/a').trim(),
                agentSlug: String(w.agentSlug || 'unknown').trim(),
                projectId: String(w.projectId || 'n/a').trim(),
                status: (w.executionState === 'active' ? 'assigned' : 'pending') as 'pending' | 'assigned',
            }));
        return rows.sort((a, b) => a.taskId.localeCompare(b.taskId));
    }, [projectScopedWorkers]);

    const dispatchLatencySummary = useMemo(() => {
        const warningThresholdMs = 3000;
        const latencies = queueSnapshot.assigned
            .map((t) => (t.assignedAt && t.queuedAt ? Math.max(0, t.assignedAt - t.queuedAt) : null))
            .filter((v): v is number => Number.isFinite(v as number));
        const avgMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
        const maxMs = latencies.length > 0 ? Math.max(...latencies) : null;
        const warning = maxMs !== null && maxMs > warningThresholdMs;
        return { avgMs, maxMs, samples: latencies.length, warningThresholdMs, warning };
    }, [queueSnapshot.assigned]);

    const workerLifecycleTimeline = useMemo(() => {
        const rows = activeEvents
            .filter((event) => {
                const t = String(event.event_type || event.type || '').trim();
                return (
                    t === 'worker.starting' ||
                    t === 'worker.spawned' ||
                    t === 'worker.reused' ||
                    t === 'worker.state_changed' ||
                    t === 'worker.failed' ||
                    t === 'worker.unhealthy'
                );
            })
            .map((event) => {
                const type = String(event.event_type || event.type || '').trim();
                return {
                    id: String(event.event_id || event.id || `${Date.now()}-${Math.random()}`),
                    at: new Date(String(event.timestamp || Date.now())).getTime(),
                    type,
                    workerId: String(event.payload?.workerId || 'n/a').trim(),
                    agentSlug: String(event.payload?.agentSlug || event.actor?.id || 'unknown').trim(),
                    from: String(event.payload?.from || '').trim(),
                    to: String(event.payload?.to || '').trim(),
                    taskId: String(event.payload?.taskId || '').trim(),
                };
            })
            .sort((a, b) => b.at - a.at);
        return rows.slice(0, 16);
    }, [activeEvents]);

    const workerDebugRows = useMemo(() => {
        return activeEvents
            .filter((event) => {
                const t = String(event.event_type || event.type || '').trim();
                return (
                    t === 'worker.heartbeat' ||
                    t === 'worker.state_changed' ||
                    t === 'worker.failed' ||
                    t === 'worker.unhealthy' ||
                    t === 'tool.call' ||
                    t === 'tool.called' ||
                    t === 'tool.result' ||
                    t === 'llm.request' ||
                    t === 'llm.response'
                );
            })
            .map((event) => ({
                id: String(event.event_id || event.id || `${Date.now()}-${Math.random()}`),
                at: new Date(String(event.timestamp || Date.now())).getTime(),
                type: String(event.event_type || event.type || '').trim(),
                workerId: String(event.payload?.workerId || 'n/a').trim(),
                agentSlug: String(event.payload?.agentSlug || event.actor?.id || 'unknown').trim(),
                taskId: String(event.payload?.taskId || '').trim(),
                stageId: String(event.payload?.stageId || event.source_stage || '').trim(),
                tool: String(event.payload?.tool || '').trim(),
                model: String(event.payload?.model || '').trim(),
                summary: String(event.payload?.summary || event.payload?.message || event.payload?.detail || '').trim(),
            }))
            .sort((a, b) => b.at - a.at)
            .slice(0, 40);
    }, [activeEvents]);

    const workerTraceRows = useMemo(() => {
        type TraceRow = {
            workerId: string;
            agentSlug: string;
            steps: number;
            toolCalls: number;
            llmCalls: number;
            lastAt: number;
        };
        const byWorker = new Map<string, TraceRow>();
        for (const event of activeEvents) {
            const t = String(event.event_type || event.type || '').trim();
            const workerId = String(event.payload?.workerId || '').trim();
            const agentSlug = String(event.payload?.agentSlug || event.actor?.id || 'unknown').trim();
            if (!workerId) continue;
            const key = `${agentSlug}:${workerId}`;
            const current = byWorker.get(key) || {
                workerId,
                agentSlug,
                steps: 0,
                toolCalls: 0,
                llmCalls: 0,
                lastAt: 0,
            };
            const at = new Date(String(event.timestamp || Date.now())).getTime();
            if (t === 'stage.started' || t === 'swarm_stage_completed' || t === 'agent.started' || t === 'agent.completed') {
                current.steps += 1;
            }
            if (t === 'tool.call' || t === 'tool.called') {
                current.toolCalls += 1;
            }
            if (t === 'llm.request') {
                current.llmCalls += 1;
            }
            current.lastAt = Math.max(current.lastAt, at);
            byWorker.set(key, current);
        }
        return Array.from(byWorker.values())
            .sort((a, b) => b.lastAt - a.lastAt)
            .slice(0, 20);
    }, [activeEvents]);

    const resourcePressure = useMemo(() => {
        const workers = Math.max(1, swarmSummary.workersTotal);
        const pressure = swarmSummary.queuePressure;
        const ratio = pressure / workers;
        if (ratio >= 2) return { label: 'overload', className: 'text-red-400' };
        if (ratio >= 1) return { label: 'high', className: 'text-amber-300' };
        return { label: 'normal', className: 'text-emerald-400' };
    }, [swarmSummary.queuePressure, swarmSummary.workersTotal]);

    const appendMessagesToThread = (threadId: string | undefined, next: ChatMessage[]) => {
        const key = threadId && threadId.trim().length > 0 ? threadId : activeThreadKey;
        if (next.length === 0) return;
        setMessagesByThread((prev) => ({
            ...prev,
            [key]: [...(prev[key] || []), ...next],
        }));
    };

    const appendMessageToThread = (threadId: string | undefined, next: ChatMessage) => {
        appendMessagesToThread(threadId, [next]);
    };

    const appendAgentMessageIfChanged = (threadId: string | undefined, content: string, timestamp?: Date) => {
        const text = String(content || '').trim();
        if (!text) return;
        const key = threadId && threadId.trim().length > 0 ? threadId : activeThreadKeyRef.current;
        const nowTs = (timestamp || new Date()).getTime();
        setMessagesByThread((prev) => {
            const existing = prev[key] || [];
            const last = existing[existing.length - 1];
            if (last && last.role === 'agent' && String(last.content || '').trim() === text) {
                return prev;
            }
            // Drop near-duplicate telemetry chatter within recent window.
            const duplicateRecent = existing
                .slice(-8)
                .some((msg) =>
                    msg.role === 'agent' &&
                    String(msg.content || '').trim() === text &&
                    Math.abs(nowTs - new Date(msg.timestamp).getTime()) <= 15000
                );
            if (duplicateRecent) return prev;
            return {
                ...prev,
                [key]: [
                    ...existing,
                    {
                        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        role: 'agent' as const,
                        content: text,
                        timestamp: timestamp || new Date(),
                    },
                ],
            };
        });
    };

    const normalizeSseEvent = (raw: CanonicalSseEvent): RuntimeEvent => {
        const timestamp = raw?.timestamp ?? Date.now();
        const timestampIso = typeof timestamp === 'number'
            ? new Date(timestamp).toISOString()
            : String(timestamp);
        const payload = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
        return {
            event_id: String(raw?.event_id || raw?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            event_type: String(raw?.event_type || raw?.type || '').trim(),
            timestamp: timestampIso,
            pipeline_run_id: String(raw?.pipeline_run_id || raw?.runId || ''),
            runId: String(raw?.runId || ''),
            chainId: String(raw?.chainId || raw?.thread_id || ''),
            agent_role: String(raw?.agent_role || raw?.actor?.role || raw?.actor?.id || 'system'),
            actor: raw?.actor || undefined,
            source_stage: String(raw?.source_stage || payload.stageId || ''),
            target_stage: String(raw?.target_stage || payload.nextStageId || ''),
            status: String(raw?.status || payload.status || ''),
            plane_issue_id: String(raw?.plane_issue_id || raw?.projectId || ''),
            thread_id: String(raw?.thread_id || raw?.chainId || ''),
            payload,
            type: String(raw?.type || ''),
            id: String(raw?.id || ''),
        };
    };

    // Auto-scroll refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const feedEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Audio recording ref
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const seenChatEventIdsRef = useRef<Set<string>>(new Set());
    const seenStreamEventIdsRef = useRef<Set<string>>(new Set());
    const activeThreadKeyRef = useRef(activeThreadKey);

    useEffect(() => {
        activeThreadKeyRef.current = activeThreadKey;
    }, [activeThreadKey]);

    useEffect(() => {
        agentRegistryRef.current = agentRegistry;
    }, [agentRegistry]);

    useEffect(() => {
        const previousProjectId = previousProjectRef.current;
        if (previousProjectId && selectedProject && previousProjectId !== selectedProject) {
            const previousScoped = swarmWorkers.filter((w) => String(w.projectId || '').trim() === previousProjectId);
            const previousHot = previousScoped.filter((w) => w.availabilityState === 'hot').length;
            setProjectSwitchFeedback({
                fromProjectId: previousProjectId,
                toProjectId: selectedProject,
                switching: true,
                startedAtMs: Date.now(),
                resolvedAtMs: null,
                warmupMs: null,
                previousWorkers: previousScoped.length,
                currentWorkers: 0,
                previousHot,
                currentHot: 0,
                spawned: 0,
                demoted: 0,
                coldWorkers: 0,
            });
        }
        previousProjectRef.current = selectedProject;
    }, [selectedProject, swarmWorkers]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, status]); // Added status to trigger scroll when approval card appears

    // Intentionally do not auto-scroll event feed on runtime updates.
    // This prevents jumpy UI while users inspect the swarm board/event history.

    useEffect(() => {
        const win = window as unknown as { 
            SpeechRecognition?: new () => SpeechRecognitionInstance; 
            webkitSpeechRecognition?: new () => SpeechRecognitionInstance 
        };
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            
            // Set language based on selected choice
            const langMap: Record<string, string> = {
                'auto': 'uk-UA', // default to UA for browser if auto (it doesn't have true auto)
                'uk': 'uk-UA',
                'en': 'en-US'
            };
            recognition.lang = langMap[voiceLang];

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const final = event.results[i][0].transcript;
                        setInput(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + final);
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setGhostText(interimTranscript);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);
            };

            recognitionRef.current = recognition;
        }
    }, [voiceLang]);

    useEffect(() => {
        let source: EventSource | null = null;
        let reconnectTimer: number | null = null;
        let closed = false;
        let reconnectAttempt = 0;
        const url = apiUrl('/api/events/stream');

        const scheduleReconnect = () => {
            if (closed) return;
            const delayMs = Math.min(15000, 1000 * (2 ** Math.min(reconnectAttempt, 4)));
            reconnectAttempt += 1;
            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null;
                connect();
            }, delayMs);
        };

        const connect = () => {
            if (closed) return;
            source = new EventSource(url);
            source.onopen = () => {
                reconnectAttempt = 0;
                console.log('[SSE] Connected to', url);
            };
            source.onmessage = (e) => {
                try {
                const data = JSON.parse(e.data) as CanonicalSseEvent;
                if (data.type === 'connected') return;
                const event = normalizeSseEvent(data);
                const canonicalEventId = String(event.event_id || event.id || '').trim();
                if (canonicalEventId) {
                    if (seenStreamEventIdsRef.current.has(canonicalEventId)) {
                        return;
                    }
                    seenStreamEventIdsRef.current.add(canonicalEventId);
                    if (seenStreamEventIdsRef.current.size > 2000) {
                        const first = seenStreamEventIdsRef.current.values().next().value as string | undefined;
                        if (first) seenStreamEventIdsRef.current.delete(first);
                    }
                }
                const threadKey = String(event.thread_id || event.chainId || '').trim() || '__global__';
                setEventsByThread((prev) => ({
                    ...prev,
                    [threadKey]: [...(prev[threadKey] || []), event].slice(-120),
                }));

                const eventType = String(event.event_type || '').trim();
                const isHandoffEvent = eventType === 'swarm_handoff' || eventType === 'swarm.handoff';
                const roleLabel = String(event.agent_role || 'system').trim();
                const payloadAgentSlug = String(event.payload?.agentSlug || '').trim();
                const resolvedSlug = payloadAgentSlug || resolveAgentSlug(roleLabel);
                if (resolvedSlug && resolvedSlug !== 'system') {
                    setAgentRuntime((prev) => {
                        const display = resolveAgentDisplay(resolvedSlug);
                        const existing = prev[resolvedSlug] || {
                            slug: resolvedSlug,
                            title: display.title,
                            callsign: display.callsign,
                            status: 'standby' as AgentLiveStatus,
                            currentStage: 'n/a',
                            currentTask: 'n/a',
                            currentIssue: 'n/a',
                            threadId: 'n/a',
                            lastUpdated: '',
                        };
                        const isHardFailure = eventType === 'stage.failed' || eventType === 'run.failed';
                        const status: AgentLiveStatus =
                            isHardFailure
                                ? 'unavailable'
                                : eventType === 'stage.started' || eventType === 'agent.started' || eventType === 'tool.called' || eventType === 'tool.call'
                                    || eventType === 'worker.starting' || eventType === 'worker.spawned' || eventType === 'worker.reused'
                                    ? 'active'
                                    : eventType === 'swarm_stage_completed' || eventType === 'agent.completed' || eventType === 'run.completed' || eventType === 'run.cancelled' || eventType === 'worker.state_changed'
                                        ? 'standby'
                                        : eventType === 'worker.failed' || eventType === 'worker.unhealthy'
                                            ? 'unavailable'
                                        : existing.status;
                        const currentStage =
                            String(event.payload?.stageId || event.source_stage || existing.currentStage || 'n/a').trim() || 'n/a';
                        let currentTask = existing.currentTask || 'n/a';
                        const stageRaw = String(event.payload?.stageId || event.source_stage || '').trim();
                        const stageTitleRaw = String(event.payload?.stageTitle || event.payload?.toStageTitle || '').trim();
                        const stageLabel = stageTitleRaw || (/^\d+$/.test(stageRaw) ? `step #${stageRaw}` : (stageRaw || 'n/a'));
                        if (eventType === 'stage.started') {
                            currentTask = `stage: ${stageLabel}`;
                        } else if (eventType === 'agent.started') {
                            currentTask = `stage: ${stageLabel}`;
                        } else if (eventType === 'tool.called' || eventType === 'tool.call') {
                            currentTask = `tool: ${String(event.payload?.tool || 'tool').trim()}`;
                        } else if (eventType === 'worker.heartbeat') {
                            currentTask = `heartbeat #${String(event.payload?.heartbeatCount || '?')}`;
                        } else if (eventType === 'worker.failed') {
                            currentTask = `failed: ${String(event.payload?.reason || 'runtime failure').trim()}`;
                        } else if (eventType === 'swarm_stage_completed' || eventType === 'agent.completed' || eventType === 'run.completed' || eventType === 'run.cancelled') {
                            currentTask = 'n/a';
                        }
                        const currentIssue =
                            String(event.plane_issue_id || existing.currentIssue || 'n/a').trim() || 'n/a';
                        const delegatedFrom: string | null =
                            isHandoffEvent
                                ? String(event.payload?.fromAgentTitle || event.payload?.fromAgentId || '').trim() || null
                                : existing.delegatedFrom ?? null;
                        return {
                            ...prev,
                            [resolvedSlug]: {
                                ...existing,
                                title: display.title,
                                callsign: display.callsign,
                                status,
                                currentStage,
                                currentTask: status === 'standby' ? 'n/a' : sanitizeTaskText(currentTask),
                                currentIssue,
                                threadId: threadKey,
                                lastUpdated: String(event.timestamp || new Date().toISOString()),
                                delegatedFrom,
                            },
                        };
                    });
                }

                const isActiveThreadEvent = threadKey === activeThreadKeyRef.current;
                if (eventType === 'run.started' && isActiveThreadEvent) {
                    setStatus('running');
                    if (event.pipeline_run_id) setActiveRunId(String(event.pipeline_run_id));
                }
                if (eventType === 'run.cancelled' && isActiveThreadEvent) {
                    setStatus('cancelled');
                    setIsAwaitingAgentReply(false);
                    setIsProcessing(false);
                }
                if (eventType === 'run.completed' && isActiveThreadEvent) {
                    setStatus('completed');
                    setIsAwaitingAgentReply(false);
                    setIsProcessing(false);
                }
                if (eventType === 'run.failed' && isActiveThreadEvent) {
                    setStatus('failed');
                    setIsAwaitingAgentReply(false);
                    setIsProcessing(false);
                }

                const eventId = String(event.event_id || event.id || '').trim();
                const shouldPropagateToChat =
                    !!threadKey &&
                    threadKey !== '__global__' &&
                    !!eventId &&
                    !seenChatEventIdsRef.current.has(eventId);

                if (shouldPropagateToChat) {
                    const chatTexts: string[] = [];
                    const stageRaw = String(event.payload?.stageId || event.source_stage || '').trim();
                    const stageTitleRaw = String(event.payload?.stageTitle || event.payload?.toStageTitle || '').trim();
                    const stageLabel = stageTitleRaw || (/^\d+$/.test(stageRaw) ? `step #${stageRaw}` : (stageRaw || 'n/a'));
                    const normalizeStepMessage = (raw: string): string => {
                        const value = String(raw || '').trim();
                        const compact = value.replace(/\s+/g, ' ');
                        const match = compact.match(/^agent\s+(.+?)\s+(completed|started)\s+(\d+)$/i);
                        if (match) {
                            const [, agent, action, step] = match;
                            return `Agent **${agent}** ${action.toLowerCase()} step #${step}.`;
                        }
                        return compact;
                    };
                    const inAllowlist =
                        eventType === 'swarm_stage_completed' ||
                        eventType === 'swarm.handoff' ||
                        eventType === 'agent.started' ||
                        eventType === 'agent.completed' ||
                        eventType === 'agent.message' ||
                        eventType === 'run.failed' ||
                        eventType === 'run.cancelled';

                    if ((chatEventRenderMode === 'raw' || chatEventRenderMode === 'both') && inAllowlist) {
                        const rawText = formatRawEventForChat(event);
                        if (rawText) chatTexts.push(rawText);
                    }

                    if (chatEventRenderMode === 'humanized' || chatEventRenderMode === 'both') {
                        let chatText: string | null = null;
                        if (eventType === 'swarm_stage_completed') {
                            const stageMessage = String(event.payload?.message || '').trim();
                            if (stageMessage) {
                                chatText = normalizeStepMessage(stageMessage);
                            } else {
                                chatText = `Swarm update: **${roleLabel}** completed stage \`${stageLabel}\`.`;
                            }
                        } else if (eventType === 'swarm.handoff') {
                            const fromAgent = String(event.payload?.fromAgentTitle || event.payload?.fromAgentId || 'unknown').trim();
                            const toAgent = String(event.payload?.toAgentTitle || event.payload?.toAgentId || 'unknown').trim();
                            chatText = stageLabel && stageLabel !== 'n/a'
                                ? `Handoff: \`${fromAgent}\` -> \`${toAgent}\` (next: \`${stageLabel}\`)`
                                : `Handoff: \`${fromAgent}\` -> \`${toAgent}\``;
                        } else if (eventType === 'agent.started') {
                            chatText = `Agent **${roleLabel}** started \`${stageLabel}\`.`;
                        } else if (eventType === 'agent.completed') {
                            const outcome = String(event.payload?.outcome || '').trim();
                            const summary = String(event.payload?.summary || '').trim();
                            chatText = outcome
                                ? `Agent **${roleLabel}** completed \`${stageLabel}\` with status \`${outcome}\`.${summary ? `\n\n${summary}` : ''}`
                                : `Agent **${roleLabel}** completed \`${stageLabel}\`.${summary ? `\n\n${summary}` : ''}`;
                        } else if (eventType === 'agent.message') {
                            chatText = String(event.payload?.message || event.payload?.content || '').trim() || null;
                        } else if (eventType === 'run.failed') {
                            chatText = `Run failed: ${String(event.payload?.message || event.payload?.reason || 'unknown error')}`;
                        } else if (eventType === 'run.cancelled') {
                            chatText = `Run cancelled: ${String(event.payload?.reason || 'Cancelled by user')}`;
                        }
                        if (chatText) chatTexts.push(chatText);
                    }
                    if (eventType === 'run.completed' && threadKey === activeThreadKeyRef.current) {
                        setAgentRuntime((prev) => {
                            const next = { ...prev };
                            for (const [slug, runtime] of Object.entries(next)) {
                                if (runtime.threadId === threadKey) {
                                    next[slug] = {
                                        ...runtime,
                                        status: runtime.status === 'unavailable' ? 'unavailable' : 'standby',
                                        currentTask: 'n/a',
                                    };
                                }
                            }
                            return next;
                        });
                    }

                    if (chatTexts.length > 0) {
                        seenChatEventIdsRef.current.add(eventId);
                        if (seenChatEventIdsRef.current.size > 500) {
                            const first = seenChatEventIdsRef.current.values().next().value as string | undefined;
                            if (first) seenChatEventIdsRef.current.delete(first);
                        }
                        const ts = new Date(event.timestamp || Date.now());
                        for (const chatText of chatTexts) {
                            appendAgentMessageIfChanged(threadKey, chatText, ts);
                        }
                    }
                }

                } catch (err) {
                    console.error('SSE Error parsing data:', err);
                }
            };

            source.onerror = (err) => {
                console.error('SSE connection error:', err);
                if (source) {
                    source.close();
                    source = null;
                }
                scheduleReconnect();
            };
        };

        connect();

        return () => {
            closed = true;
            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
            }
            console.log('[SSE] Closing connection');
            if (source) source.close();
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = () => {
            setRuntimePickerOpen(null);
            setShowPlusMenu(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!replayEnabled || !replayPlaying) return;
        const total = activeEvents.length;
        if (total === 0) return;
        const timer = window.setInterval(() => {
            setReplayIndex((prev) => {
                if (prev >= total) {
                    setReplayPlaying(false);
                    return total;
                }
                return prev + 1;
            });
        }, Math.max(100, replaySpeedMs));
        return () => window.clearInterval(timer);
    }, [replayEnabled, replayPlaying, replaySpeedMs, activeEvents.length]);

    useEffect(() => {
        if (!replayEnabled) return;
        const total = activeEvents.length;
        if (replayIndex > total) {
            setReplayIndex(total);
        }
    }, [activeEvents.length, replayEnabled, replayIndex]);

    const handleFileAttach = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        const formData = new FormData();
        for (const file of files) formData.append('files', file);
        formData.append('projectId', selectedProject);
        formData.append('threadId', selectedThread);
        try {
            const res = await fetch(apiUrl('/api/cockpit/attachments/upload'), {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.attachments)) {
                const next = data.attachments as UploadedAttachment[];
                setUploadedAttachments((prev) => [...prev, ...next]);
                const fileTokens = next.map((file) => `[file:${file.originalName}]`).join(' ');
                setInput((prev) => `${prev}${prev.trim().length > 0 ? ' ' : ''}${fileTokens}`.trimStart());
            }
        } catch (e) {
            console.error('Attachment upload failed:', e);
        }
        event.target.value = '';
    };

    useEffect(() => {
        const loadCatalog = async () => {
            const data = await fetchJsonSafe<{ success?: boolean; agents?: string[]; pipelines?: string[]; skills?: string[] }>('/api/cockpit/catalog');
            if (data?.success) {
                setCatalog({
                    agents: data.agents || [],
                    pipelines: data.pipelines || [],
                    skills: data.skills || [],
                });
            }
        };
        const loadAgentRegistry = async () => {
            const projectQuery = selectedProject ? `?projectId=${encodeURIComponent(selectedProject)}` : '';
            const data = await fetchJsonSafe<{ success?: boolean; agents?: AgentRegistryEntry[] }>(`/api/cockpit/agents/registry${projectQuery}`);
            if (!data?.success || !Array.isArray(data.agents)) return;
            setAgentRegistry(data.agents);
            setAgentRuntime((prev) => {
                const next: Record<string, AgentRuntimeStatus> = { ...prev };
                for (const agent of data.agents || []) {
                    if (!next[agent.slug]) {
                        next[agent.slug] = {
                            slug: agent.slug,
                            title: agent.title || agent.slug,
                            callsign: agent.callsign || agent.title || agent.slug,
                            status: agent.available === false ? 'unavailable' : 'standby',
                            currentStage: 'n/a',
                            currentTask: 'n/a',
                            currentIssue: 'n/a',
                            threadId: 'n/a',
                            lastUpdated: '',
                        };
                    }
                }
                return next;
            });
        };
        void loadCatalog();
        void loadAgentRegistry();
    }, [selectedProject]);

    // Swarm control/worker endpoints are intentionally not queried from the client UI.

    useEffect(() => {
        const loadProviders = async () => {
            const data = await fetchJsonSafe<{
                success?: boolean;
                runtimeSelection?: { provider?: RuntimeProvider; model?: string };
                capabilities?: { providerModels?: Partial<Record<RuntimeProvider, string[]>> };
            }>('/api/cockpit/providers');
            if (!data?.success) return;
            const providerModels = data.capabilities?.providerModels;
            if (providerModels) {
                setProviderModelPresets((prev) => ({
                    'claude-cli': providerModels['claude-cli']?.length ? providerModels['claude-cli'] : prev['claude-cli'],
                    'codex-cli': providerModels['codex-cli']?.length ? providerModels['codex-cli'] : prev['codex-cli'],
                    'openhands-sdk': providerModels['openhands-sdk']?.length ? providerModels['openhands-sdk'] : prev['openhands-sdk'],
                }));
            }
            if (data.runtimeSelection?.provider) setSelectedProvider(data.runtimeSelection.provider);
            if (data.runtimeSelection?.model) setSelectedModel(data.runtimeSelection.model);
        };
        void loadProviders();
        void loadRuntimeFooter();
    }, []);

    useEffect(() => {
        const loadChains = async () => {
            const data = await fetchJsonSafe<{
                success?: boolean;
                projects?: RailProject[];
                threadsByProject?: Record<string, RailThread[]>;
            }>('/api/cockpit/chains');
            if (!data?.success) return;
            const projects = data.projects || [];
            const threads = data.threadsByProject || {};
            setRailProjects(projects);
            setRailThreadsByProject(threads);

            if (!projects.some((p) => p.id === selectedProject)) {
                const nextProject = projects[0]?.id || '';
                setSelectedProject(nextProject);
                setSelectedThread((threads[nextProject] || [])[0]?.id || '');
                return;
            }

            if (!(threads[selectedProject] || []).some((t) => t.id === selectedThread)) {
                setSelectedThread((threads[selectedProject] || [])[0]?.id || '');
            }
        };
        void loadChains();
    }, [selectedProject, selectedThread]); // Added dependencies per lint rule

    useEffect(() => {
        const threadId = String(selectedThread || '').trim();
        if (!threadId) return;
        const loadThreadMessages = async () => {
            const data = await fetchJsonSafe<{
                success?: boolean;
                threadId?: string;
                messages?: PersistedThreadMessage[];
            }>(`/api/cockpit/chains/${encodeURIComponent(threadId)}/messages`);
            if (!data?.success || !Array.isArray(data.messages)) return;
            setMessagesByThread((prev) => ({
                ...prev,
                [threadId]: data.messages!.map((item) => ({
                    id: item.id,
                    role: item.role,
                    content: item.content,
                    timestamp: new Date(item.timestamp),
                })),
            }));
        };
        void loadThreadMessages();
    }, [selectedThread]);

    useEffect(() => {
        const loadWorkScope = async () => {
            const params = new URLSearchParams({
                mode: 'all',
                cycleId: workScope.selected.cycleId || '',
                storyId: workScope.selected.storyId || '',
            });
            const data = await fetchJsonSafe<any>(`/api/cockpit/work-scope?${params.toString()}`);
            if (!data?.success) return;
            setWorkScope({
                cycles: data.cycles || [],
                stories: data.stories || [],
                tasks: data.tasks || [],
                items: data.items || [],
                selected: data.selected || { cycleId: '', storyId: '' },
                statusSummary: data.statusSummary || { total: 0, done: 0, inProgress: 0, todo: 0 },
            });
            setSelectedScopeItemIds((prev) => prev.filter((id) => (data.items || []).some((it: ScopeEntity) => it.id === id)));
        };
        void loadWorkScope();
    }, [workScope.selected.cycleId, workScope.selected.storyId]);

    useEffect(() => {
        const closePicker = () => setRuntimePickerOpen(null);
        window.addEventListener('click', closePicker);
        return () => window.removeEventListener('click', closePicker);
    }, []);

    const handleSend = async () => {
        const hasText = input.trim().length > 0;
        const hasTokens = promptTokens.length > 0;
        if ((!hasText && !hasTokens) || isProcessing || isAwaitingAgentReply) return;
        
        const threadIdToUse = String(selectedThread || '').trim() || `thread_${Date.now()}`;
        if (!selectedThread) {
            setSelectedThread(threadIdToUse);
            setCurrentThreadId(threadIdToUse);
        }

        const tokenPayload = promptTokens.map((t) => `${t.kind}:${t.value}`).join('\n');
        const selectedScopeKeys = workScope.items
            .filter((it) => selectedScopeItemIds.includes(it.id))
            .map((it) => `scope:item:${it.key}`);
        const scopePayload = selectedScopeKeys.join('\n');
        const attachmentPayload = uploadedAttachments
            .map((a) => `attachment:${a.originalName}`)
            .join('\n');
        const userMsg = [tokenPayload, scopePayload, attachmentPayload, input.trim()].filter(Boolean).join('\n');
        setInput('');
        setPromptTokens([]);
        setUploadedAttachments([]);
        
        appendMessageToThread(threadIdToUse, {
            id: Date.now().toString(),
            role: 'user',
            content: userMsg,
            timestamp: new Date()
        });

        setIsProcessing(true);
        setIsAwaitingAgentReply(true);
        setStatus('running');

        try {
            const res = await fetch(apiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    executionMode: mode,
                    projectId: selectedProject,
                    threadId: threadIdToUse,
                    attachments: uploadedAttachments,
                }),
            });
            const data = await res.json();
            
            if (data.success) { // Changed from data.logs to data.success as threadId/status might be present without logs
                const responseThreadId = String(data.threadId || selectedThread || '').trim();
                if (responseThreadId) {
                    setCurrentThreadId(responseThreadId);
                    setSelectedThread(responseThreadId);
                }
                if (data.runId) setActiveRunId(String(data.runId));
                setCurrentTicketId(data.ticketId || null);
                setStatus(data.status);
                if (data.observability) setObservability(data.observability);
                if (data.gitContext) setGitContext(data.gitContext);

                // 1. If we have a direct message (conversational response), show it first
                if (data.message) {
                    appendAgentMessageIfChanged(responseThreadId || threadIdToUse, data.message, new Date());
                    setIsAwaitingAgentReply(false);
                }
                // 2. If backend returns aggregated logs, display them as assistant output.
                else if (Array.isArray(data.logs) && data.logs.length > 0) {
                    appendMessagesToThread(responseThreadId || threadIdToUse, data.logs.map((log: string, i: number) => ({
                        id: `${Date.now()}-${i}`,
                        role: 'agent',
                        content: log,
                        timestamp: new Date()
                    })));
                    setIsAwaitingAgentReply(false);
                } 
                // 3. Otherwise, indicate swarm dispatch
                else {
                    const runId = typeof data.runId === 'string' ? data.runId : '';
                    const runIdShort = runId ? runId.slice(0, 8) : 'n/a';
                    appendMessageToThread(responseThreadId || threadIdToUse, {
                        id: Date.now().toString(),
                        role: 'agent',
                        content: `Task dispatched to Swarm (Run ID: ${runIdShort}). See event feed for updates.`,
                        timestamp: new Date()
                    });
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            setIsAwaitingAgentReply(false);
            setIsProcessing(false);
            setStatus('failed');
            appendMessageToThread(threadIdToUse, {
                id: `chat-error-${Date.now()}`,
                role: 'agent',
                content: 'Request failed. Please retry in a few seconds.',
                timestamp: new Date()
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStop = async () => {
        const threadIdToCancel = String(selectedThread || currentThreadId || '').trim();
        if (!threadIdToCancel && !activeRunId) return;
        try {
            await fetch(apiUrl('/api/chat/cancel'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadId: threadIdToCancel || undefined,
                    runId: activeRunId || undefined,
                    reason: 'Cancelled by user from cockpit',
                }),
            });
            setStatus('cancelled');
            setIsProcessing(false);
            setIsAwaitingAgentReply(false);
            appendMessageToThread(threadIdToCancel || activeThreadKeyRef.current, {
                id: `chat-cancel-${Date.now()}`,
                role: 'agent',
                content: 'Run cancelled by user.',
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Cancel error:', error);
        }
    };

    const replayVisibleEvents = useMemo(() => {
        if (!replayEnabled) return activeEvents;
        const cut = Math.max(0, Math.min(replayIndex, activeEvents.length));
        return activeEvents.slice(0, cut);
    }, [activeEvents, replayEnabled, replayIndex]);

    const handleApprove = async () => {
        if (!currentThreadId || isProcessing) return;
        setIsProcessing(true);

        try {
            const res = await fetch(apiUrl('/api/chat/approve'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId: currentThreadId, ticketId: currentTicketId })
            });
            const data = await res.json();
            
            if (data.success) {
                setStatus(data.status);
                if (data.observability) setObservability(data.observability);
                if (data.gitContext) setGitContext(data.gitContext);
                if (data.logs) {
                    appendMessagesToThread(selectedThread, data.logs.map((log: string, i: number) => ({
                        id: `${Date.now()}-${i}`,
                        role: 'agent',
                        content: log,
                        timestamp: new Date()
                    })));
                }
            }
        } catch (error) {
            console.error('Approve error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            recognitionRef.current?.stop();
            setIsRecording(false);
            setGhostText('');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                // Final refined transcription default (Whisper)
                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice.webm');
                
                // Add language if not auto
                if (voiceLang !== 'auto') {
                    formData.set('language', voiceLang);
                }

                setIsProcessing(true);
                try {
                    const res = await fetch(apiUrl('/api/voice/transcribe'), {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await res.json();
                    if (data.text && data.text.length > 5) { // Only overwrite if Whisper is distinct
                        // setInput(prev => prev + ' ' + data.text); 
                        console.log('[Whisper] Feedback:', data.text);
                    }
                } catch (e) {
                    console.error("Transcribe default-path failed:", e);
                } finally {
                    setIsProcessing(false);
                }
            };

            mediaRecorder.start();
            recognitionRef.current?.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone');
        }
    };

    const appendCommand = (kind: PromptTokenKind, value: string) => {
        setPromptTokens((prev) => {
            const exists = prev.some((t) => t.kind === kind && t.value === value);
            if (exists) return prev;
            return [...prev, { kind, value }];
        });
    };

    const closeAutocomplete = () => {
        setMetaAutocomplete((prev) => ({ ...prev, open: false, suggestions: [] }));
    };

    const updateAutocomplete = (value: string, cursor: number) => {
        const before = value.slice(0, cursor);
        const match = before.match(/(^|\s)([@/#])([a-zA-Z0-9._-]*)$/);
        if (!match) {
            closeAutocomplete();
            return;
        }
        const symbol = match[2];
        const rawQuery = (match[3] || '').toLowerCase();
        const tokenLen = symbol.length + (match[3] || '').length;
        const rangeStart = cursor - tokenLen;
        const source = symbol === '@'
            ? catalog.agents
            : symbol === '/'
                ? catalog.pipelines
                : catalog.skills;
        const suggestions = source
            .filter((item) => item.toLowerCase().includes(rawQuery))
            .slice(0, 8);
        if (suggestions.length === 0) {
            closeAutocomplete();
            return;
        }
        setMetaAutocomplete({
            open: true,
            kind: symbol === '@' ? 'agent' : symbol === '/' ? 'pipeline' : 'skill',
            query: rawQuery,
            rangeStart,
            rangeEnd: cursor,
            selectedIndex: 0,
            suggestions,
        });
    };

    const applyAutocompleteChoice = (forcedIndex?: number) => {
        if (!metaAutocomplete.open || !metaAutocomplete.kind || metaAutocomplete.suggestions.length === 0) return;
        const idx = typeof forcedIndex === 'number'
            ? forcedIndex
            : metaAutocomplete.selectedIndex;
        const chosen = metaAutocomplete.suggestions[idx];
        if (!chosen) return;
        appendCommand(metaAutocomplete.kind, chosen);
        setInput((prev) => `${prev.slice(0, metaAutocomplete.rangeStart)}${prev.slice(metaAutocomplete.rangeEnd)}`.replace(/\s{2,}/g, ' '));
        closeAutocomplete();
    };

    const handleTokenDrop = (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData('text/plain') || '';
        const [kind, ...rest] = raw.split(':');
        const value = rest.join(':').trim();
        if (!value) return;
        if (kind === 'agent' || kind === 'pipeline' || kind === 'skill') {
            appendCommand(kind, value);
        }
    };

    const removeToken = (kind: PromptTokenKind, value: string) => {
        setPromptTokens((prev) => prev.filter((t) => !(t.kind === kind && t.value === value)));
    };

    const rehydrateTokenIntoInput = (token: PromptToken) => {
        const prefix = token.kind === 'agent' ? '@' : token.kind === 'pipeline' ? '/' : '#';
        setInput((prev) => `${prev}${prev ? ' ' : ''}${prefix}${token.value} `);
    };

    const slugifyProjectId = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || `project-${Date.now()}`;

    const getFolderNameFromPath = (value: string): string => {
        const trimmed = value.trim().replace(/[\\/]+$/, '');
        if (!trimmed) return '';
        const segments = trimmed.split(/[\\/]/).filter(Boolean);
        return segments[segments.length - 1] || '';
    };

    const getParentDir = (value: string): string => {
        const trimmed = value.trim().replace(/[\\/]+$/, '');
        if (!trimmed) return '';
        const slashIndex = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
        if (slashIndex <= 0) return '';
        return trimmed.slice(0, slashIndex);
    };

    const isAbsolutePath = (value: string): boolean => {
        const v = value.trim();
        if (!v) return false;
        return v.startsWith('/') || /^[A-Za-z]:[\\/]/.test(v);
    };

    const getUniqueProjectId = (baseId: string): string => {
        const existing = new Set(railProjects.map((p) => p.id));
        if (!existing.has(baseId)) return baseId;
        let idx = 2;
        while (existing.has(`${baseId}-${idx}`)) idx += 1;
        return `${baseId}-${idx}`;
    };

    const syncProjectRuntimeContext = async (projectId: string) => {
        const data = await fetchJsonSafe<any>('/api/cockpit/projects/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
        });
        if (data?.success && data.runtimeFooter) {
            setRuntimeFooter(data.runtimeFooter);
        }
    };

    const handleCreateChain = async (
        projectIdArg?: string,
        labelArg?: string,
        options?: {
            projectLabel?: string;
            worktreePath?: string;
            agentContextPath?: string;
            planeProjectId?: string;
            createPlaneProject?: boolean;
            onboardingMode?: 'local' | 'repository';
            repositoryUrl?: string;
            onboardingAuthMode?: 'none' | 'oauth' | 'pat';
            onboardingBootstrapMode?: 'none' | 'auto-template' | 'read-only';
            onboardingReadOnly?: boolean;
        },
    ): Promise<boolean> => {
        const projectId = projectIdArg || selectedProject;
        if (!projectId) return false;
        const response = await fetch(apiUrl('/api/cockpit/chains'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                label: labelArg || `New chat ${new Date().toLocaleTimeString()}`,
                projectLabel: options?.projectLabel,
                worktreePath: options?.worktreePath,
                agentContextPath: options?.agentContextPath,
                planeProjectId: options?.planeProjectId,
                createPlaneProject: options?.createPlaneProject,
                onboardingMode: options?.onboardingMode,
                repositoryUrl: options?.repositoryUrl,
                onboardingAuthMode: options?.onboardingAuthMode,
                onboardingBootstrapMode: options?.onboardingBootstrapMode,
                onboardingReadOnly: options?.onboardingReadOnly,
            }),
        });
        let data: any = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        if (!response.ok || !data?.success) {
            const code = String(data?.error || '');
            if (code === 'plane_project_required') {
                setProviderMessage('Select a Plane project or explicitly enable new Plane project creation.');
            } else {
                setProviderMessage(String(data?.message || data?.error || 'Failed to create chain: backend unavailable'));
            }
            return false;
        }
        setRailProjects(data.projects || []);
        setRailThreadsByProject(data.threadsByProject || {});
        setSelectedProject(projectId);
        if (data.thread?.id) setSelectedThread(data.thread.id);
        void syncProjectRuntimeContext(projectId);
        return true;
    };

    const applyChainsSnapshot = (
        projects: RailProject[],
        threadsByProject: Record<string, RailThread[]>,
        preferredProjectId?: string,
        preferredThreadId?: string,
    ) => {
        setRailProjects(projects);
        setRailThreadsByProject(threadsByProject);

        const effectiveProject =
            (preferredProjectId && projects.some((p) => p.id === preferredProjectId) && preferredProjectId) ||
            (selectedProject && projects.some((p) => p.id === selectedProject) && selectedProject) ||
            projects[0]?.id ||
            '';

        const projectThreads = threadsByProject[effectiveProject] || [];
        const effectiveThread =
            (preferredThreadId && projectThreads.some((t) => t.id === preferredThreadId) && preferredThreadId) ||
            (selectedThread && projectThreads.some((t) => t.id === selectedThread) && selectedThread) ||
            projectThreads[0]?.id ||
            '';

        setSelectedProject(effectiveProject);
        setSelectedThread(effectiveThread);
    };

    const handleDeleteThread = async (projectId: string, threadId: string) => {
        if (!threadId) return;
        const ok = window.confirm('Delete this chat thread?');
        if (!ok) return;
        const data = await fetchJsonSafe<any>(`/api/cockpit/chains/${encodeURIComponent(threadId)}`, {
            method: 'DELETE',
        });
        if (!data?.success) {
            setProviderMessage('Failed to delete chat thread');
            return;
        }
        const nextThreadId = (data.threadsByProject?.[projectId] || [])[0]?.id || '';
        applyChainsSnapshot(data.projects || [], data.threadsByProject || {}, projectId, nextThreadId);
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!projectId) return;
        const ok = window.confirm('Delete this project and all its chat threads?');
        if (!ok) return;
        const response = await fetch(apiUrl(`/api/cockpit/projects/${encodeURIComponent(projectId)}`), {
            method: 'DELETE',
        });
        let data: any = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        if (!response.ok || !data?.success) {
            setProviderMessage(String(data?.message || data?.error || 'Failed to delete project'));
            return;
        }
        applyChainsSnapshot(data.projects || [], data.threadsByProject || {});
    };

    const handleChooseDirectory = async () => {
        const win = window as DirectoryPickerWindow;
        if (!win.showDirectoryPicker) {
            setProviderMessage('Directory picker is unavailable in this browser. Paste folder path manually.');
            return;
        }
        try {
            const handle = await win.showDirectoryPicker();
            const explicitPath = String(handle?.path || handle?.fullPath || '').trim();
            if (explicitPath) {
                setProjectDirectory(explicitPath);
                return;
            }

            const folderName = String(handle?.name || '').trim();
            if (!folderName) return;

            if (folderName.includes('/') || folderName.includes('\\')) {
                setProjectDirectory(folderName);
                return;
            }

            const parentCandidates = [
                getParentDir(runtimeFooter.worktreePath || ''),
                getParentDir(gitContext?.worktreePath || ''),
            ].filter(Boolean);

            if (!parentCandidates[0]) {
                setProjectDirectory(folderName);
                setProviderMessage('Directory picker returned only folder name. Paste absolute project path manually.');
                return;
            }
            setProjectDirectory(`${parentCandidates[0].replace(/[\\/]+$/, '')}/${folderName}`);
        } catch {
            // User canceled picker.
        }
    };

    const loadPlaneProjectOptions = async () => {
        setIsLoadingPlaneProjects(true);
        const data = await fetchJsonSafe<any>('/api/cockpit/plane/projects');
        if (!data?.success) {
            setPlaneProjectOptions([]);
            setPlaneProjectsConfigured(false);
            setProviderMessage('Failed to load Plane projects.');
            setIsLoadingPlaneProjects(false);
            return;
        }
        setPlaneProjectOptions(Array.isArray(data.projects) ? data.projects : []);
        setPlaneProjectsConfigured(Boolean(data.configured));
        setIsLoadingPlaneProjects(false);
    };

    const openProjectModal = () => {
        setProjectDirectory('');
        setProjectAgentContextDirectory('');
        setProjectOnboardingMode('repository');
        setProjectRepositoryUrl('');
        setProjectRepositoryAuthMode('oauth');
        setProjectBootstrapMode('read-only');
        setSelectedPlaneProjectId('');
        setCreatePlaneProject(false);
        setPlaneProjectOptions([]);
        setPlaneProjectsConfigured(null);
        setIsProjectModalOpen(true);
        void loadPlaneProjectOptions();
    };

    const resetProjectModalState = () => {
        setIsProjectModalOpen(false);
        setProjectDirectory('');
        setProjectAgentContextDirectory('');
        setProjectOnboardingMode('repository');
        setProjectRepositoryUrl('');
        setProjectRepositoryAuthMode('oauth');
        setProjectBootstrapMode('read-only');
        setSelectedPlaneProjectId('');
        setCreatePlaneProject(false);
        setPlaneProjectOptions([]);
        setPlaneProjectsConfigured(null);
        setIsLoadingPlaneProjects(false);
    };

    const handleAddNewProject = async () => {
        const absoluteDirectory = projectDirectory.trim();
        const absoluteAgentContextDirectory = projectAgentContextDirectory.trim();
        const repositoryUrl = projectRepositoryUrl.trim();
        if (projectOnboardingMode === 'local') {
            if (!isAbsolutePath(absoluteDirectory)) {
                setProviderMessage('Project directory must be an absolute path.');
                return;
            }
            if (!isAbsolutePath(absoluteAgentContextDirectory)) {
                setProviderMessage('Agent files directory must be an absolute path.');
                return;
            }
        } else if (!repositoryUrl) {
            setProviderMessage('Repository URL is required for repository onboarding.');
            return;
        }
        if (!selectedPlaneProjectId && !createPlaneProject) {
            setProviderMessage('Select an existing Plane project or enable "Create new Plane project".');
            return;
        }
        const repoDerivedName = repositoryUrl
            .split('/')
            .filter(Boolean)
            .pop()
            ?.replace(/\.git$/i, '')
            || '';
        const folderName = projectOnboardingMode === 'local'
            ? getFolderNameFromPath(absoluteDirectory)
            : repoDerivedName;
        if (!folderName) return;
        const projectId = getUniqueProjectId(slugifyProjectId(folderName));
        const created = await handleCreateChain(projectId, 'New chat', {
            projectLabel: folderName,
            worktreePath: absoluteDirectory || undefined,
            agentContextPath: absoluteAgentContextDirectory || undefined,
            planeProjectId: selectedPlaneProjectId || undefined,
            createPlaneProject,
            onboardingMode: projectOnboardingMode,
            repositoryUrl: repositoryUrl || undefined,
            onboardingAuthMode: projectRepositoryAuthMode,
            onboardingBootstrapMode: projectBootstrapMode,
            onboardingReadOnly: projectBootstrapMode === 'read-only',
        });
        if (!created) return;
        setSelectedProject(projectId);
        resetProjectModalState();
    };

    const handleAddNewChain = async () => {
        const chainLabel = (newChainLabel || '').trim() || `New chat ${new Date().toLocaleTimeString()}`;
        const projectId = newChainScope === 'unbound' ? '__unbound__' : selectedProject;
        if (!projectId) return;
        const created = await handleCreateChain(projectId, chainLabel);
        if (!created) return;
        setIsChainModalOpen(false);
        setNewChainLabel('');
        setNewChainScope('current');
    };

    const planeTicketUrl = (ticketId: string): string | null => {
        if (!ticketId || ticketId.startsWith('chat-')) return null;
        const env = (import.meta as { env?: Record<string, string | undefined> }).env;
        const base = env?.VITE_PLANE_BASE_URL || 'https://app.plane.so';
        const projectCode = env?.VITE_PLANE_PROJECT_CODE || 'AGENTS';
        return `${base.replace(/\/$/, '')}/workspace/projects/${projectCode}/issues/${ticketId}`;
    };

    const statusBadgeClass = (status?: string): string => {
        const s = (status || '').toLowerCase();
        if (s.includes('success') || s.includes('done') || s.includes('completed')) return 'status-badge ok';
        if (s.includes('fail') || s.includes('error') || s.includes('blocked')) return 'status-badge fail';
        if (s.includes('progress') || s.includes('running') || s.includes('started')) return 'status-badge progress';
        return 'status-badge neutral';
    };

    const runtimeModeLabel = 'Multiple agents';

    const applyRuntimeSelection = async (provider?: RuntimeProvider, model?: string) => {
        const nextProvider = provider || selectedProvider;
        const nextModel = model || selectedModel;
        const data = await fetchJsonSafe<any>('/api/cockpit/providers/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: nextProvider, model: nextModel }),
        });
        setProviderMessage(data?.success
            ? `runtime set: ${nextProvider}/${nextModel}`
            : 'runtime select failed: backend unavailable');
    };

    const loadRuntimeFooter = async () => {
        const data = await fetchJsonSafe<any>('/api/cockpit/runtime-footer');
        if (data?.success && data.runtimeFooter) {
            setRuntimeFooter(data.runtimeFooter);
            setGitContext({
                activeBranch: data.runtimeFooter.activeBranch,
                worktreePath: data.runtimeFooter.worktreePath,
                preflightToken: data.runtimeFooter.preflightToken,
            });
        }
    };

    const updateRuntimeFooter = async (patch: Partial<Pick<RuntimeFooterState, 'executionTarget' | 'accessPolicy'>>) => {
        const data = await fetchJsonSafe<any>('/api/cockpit/runtime-footer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (data?.success && data.runtimeFooter) {
            setRuntimeFooter((prev) => ({ ...prev, ...data.runtimeFooter }));
        } else {
            setProviderMessage('runtime footer update failed: backend unavailable');
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            <main className="flex-1 flex overflow-hidden">
                <aside className={`flex flex-col border-r border-border/50 bg-sidebar/5 transition-all duration-300 ${railCollapsed ? 'w-12' : 'w-72'}`}>
                    <div className="flex items-center justify-between h-12 px-3 border-b border-border/50">
                        {!railCollapsed && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</span>}
                        <Button variant="ghost" size="icon" className="size-8 ml-auto" onClick={() => setRailCollapsed((p) => !p)} title={railCollapsed ? 'Open sidebar' : 'Hide sidebar'}>
                            {railCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                        </Button>
                    </div>
                    {!railCollapsed && (
                        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-4">
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="justify-start gap-2 h-9"
                                    onClick={() => {
                                        if (!selectedProject) {
                                            openProjectModal();
                                            return;
                                        }
                                        setIsChainModalOpen(true);
                                    }}
                                >
                                    <PencilLine className="size-4" />
                                    <span>New Thread</span>
                                </Button>
                                <Button
                                   variant="ghost"
                                   size="sm"
                                   className="justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
                                   onClick={openProjectModal}
                                >
                                    <FolderPlus className="size-4" />
                                    <span>Add Project</span>
                                </Button>
                            </div>
                            <Separator className="bg-border/50" />
                            <div className="flex items-center gap-2 px-1 py-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex-1">Projects</span>
                            </div>
                            <ScrollArea className="flex-1 -mx-1 px-1">
                                <div className="flex flex-col gap-1">
                                    {railProjects.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2 opacity-60">
                                            <Folder className="size-8 text-muted-foreground/40" />
                                            <div className="text-xs font-medium">No projects yet</div>
                                            <Button variant="outline" size="sm" className="h-8 gap-2 mt-2" onClick={openProjectModal}>
                                                <FolderPlus className="size-3.5" />
                                                Add Project
                                            </Button>
                                        </div>
                                    ) : railProjects.map((project) => (
                                        <div key={project.id} className="flex flex-col gap-0.5">
                                            <div className="group flex items-center gap-1">
                                                <Button
                                                    variant={selectedProject === project.id ? "secondary" : "ghost"}
                                                    size="sm"
                                                    className="flex-1 justify-start gap-2 h-8 px-2 text-xs font-medium"
                                                    onClick={() => {
                                                        setSelectedProject(project.id);
                                                        setSelectedThread((railThreadsByProject[project.id] || [])[0]?.id || '');
                                                        void syncProjectRuntimeContext(project.id);
                                                    }}
                                                >
                                                    <Folder className={`size-3.5 ${selectedProject === project.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <span className="truncate">{project.label}</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleDeleteProject(project.id);
                                                    }}
                                                >
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>
                                            {selectedProject === project.id && (
                                                <div className="flex flex-col gap-0.5 ml-4 pl-2 border-l border-border/50 my-1">
                                                    {(railThreadsByProject[project.id] || []).map((thread) => (
                                                        <div key={thread.id} className="group flex items-center gap-1">
                                                            <Button
                                                                variant={selectedThread === thread.id ? "ghost" : "ghost"}
                                                                size="sm"
                                                                className={`flex-1 justify-start gap-2 h-7 px-2 text-[11px] font-normal ${selectedThread === thread.id ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                                                                onClick={() => setSelectedThread(thread.id)}
                                                            >
                                                                <span className="truncate flex-1 text-left">{thread.label}</span>
                                                                <span className="text-[9px] opacity-40 shrink-0">{new Date(thread.updatedAt).toLocaleDateString()}</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    void handleDeleteThread(project.id, thread.id);
                                                                }}
                                                            >
                                                                <Trash2 className="size-2.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </aside>
                {/* Left Panel: Chat Input */}
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
                                messages.map((m) => (
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
                                            {(() => {
                                                const meeting = parseMeetingViewPayload(m.content);
                                    if (!meeting) return null;
                                    return (
                                        <div className="meeting-card">
                                            <div className="meeting-card-head">
                                                <strong>{meeting.title || 'Meeting'}</strong>
                                                <span>{meeting.turns.length} turns</span>
                                            </div>
                                            {meeting.turns.length > 0 && (
                                                <div className="meeting-turns">
                                                    {meeting.turns.map((turn, idx) => (
                                                        <div key={`${m.id}-turn-${idx}`} className="meeting-turn">
                                                            <div className="meeting-turn-meta">
                                                                <span className="meeting-role">{turn.role}</span>
                                                                <span className="meeting-round">
                                                                    {turn.round ? `Round ${turn.round}` : 'Turn'}
                                                                </span>
                                                            </div>
                                                            <div className="meeting-turn-text">{turn.text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {meeting.decision && (
                                                <div className="meeting-decision">
                                                    <span className="meeting-decision-label">Decision</span>
                                                    <div className="meeting-decision-text">{meeting.decision}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {(() => {
                                    const insight = parseMemoryInsightPayload(m.content);
                                    if (!insight) return null;
                                    return (
                                        <div className="memory-insight-card">
                                            <div className="memory-insight-head">
                                                <strong>{insight.title || 'Related Memory'}</strong>
                                                <span>{insight.items.length} items</span>
                                            </div>
                                            <div className="memory-insight-list">
                                                {insight.items.map((it) => (
                                                    <div key={`${m.id}-memory-${it.id}`} className="memory-insight-item">
                                                        <div className="memory-insight-text">{it.text}</div>
                                                        <div className="memory-insight-meta">
                                                            <span className="memory-insight-id">{it.id}</span>
                                                            {it.sourceLabel && it.sourceHref ? (
                                                                <a
                                                                    href={it.sourceHref}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="memory-insight-link"
                                                                >
                                                                    {it.sourceLabel}
                                                                </a>
                                                            ) : it.sourceLabel ? (
                                                                <span className="memory-insight-source">{it.sourceLabel}</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="chat-markdown">
                                    <ArtifactRenderer content={toRenderableMarkdown(m.content)} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
                    
                    {isAwaitingAgentReply && (
                            <div className="chat-bubble agent border-dashed border-slate-500/70 bg-slate-900/60">
                                <div className="chat-meta">
                                    <span>Agent</span>
                                    <span>now</span>
                                </div>
                                <div className="inline-flex items-center gap-2 text-slate-300" aria-live="polite" aria-label="Agent is generating response">
                                    <span className="text-[0.82rem]">Agent is thinking</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300/60 animate-pulse" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300/60 animate-pulse" style={{ animationDelay: '120ms' }} />
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300/60 animate-pulse" style={{ animationDelay: '240ms' }} />
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {status === 'awaiting_approval' && (
                            <div className="approval-card">
                                <p>Agent is waiting for your approval to proceed to the next stage.</p>
                                <button 
                                    className="approve-btn" 
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Approve & Continue'}
                                </button>
                            </div>
                        )}
                        
                        <div ref={scrollRef} />
                    </div>
                    </ScrollArea>

                    {/* Chat Input Area (Fixed at bottom of left panel) */}
                    <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-md sticky bottom-0">
                        <div className="max-w-4xl mx-auto flex flex-col gap-3">
                            <div className="relative group">
                                <Input 
                                    className="pr-12 py-6 text-sm bg-muted/50 border-border/50 focus-visible:ring-primary/20 transition-all rounded-xl"
                                    placeholder="Execute command or ask the Swarm..."
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Button 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 size-8 p-0 rounded-lg shadow-lg shadow-primary/20"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim()}
                                >
                                    <Send className="size-4" />
                                </Button>
                            </div>
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="h-6 gap-1 border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                             onClick={(e) => { e.stopPropagation(); setRuntimePickerOpen(p => p === 'target' ? null : 'target'); }}>
                                            <Globe2 className="size-3 opacity-50" />
                                            <span>{runtimeFooter.executionTarget === 'local' ? 'Local' : 'Remote'}</span>
                                            <ChevronDown className="size-2.5 opacity-30" />
                                        </Badge>
                                        <Badge variant="outline" className="h-6 gap-1 border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                             onClick={(e) => { e.stopPropagation(); setRuntimePickerOpen(p => p === 'access' ? null : 'access'); }}>
                                            <ShieldCheck className="size-3 opacity-50 text-amber-500" />
                                            <span>{runtimeFooter.accessPolicy === 'full-access' ? 'Full Access' : 'Sandbox'}</span>
                                            <ChevronDown className="size-2.5 opacity-30" />
                                        </Badge>
                                    </div>
                                    <Separator orientation="vertical" className="h-3 mx-1" />
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate opacity-60">
                                        <span className="font-medium text-foreground/50">{runtimeModeLabel}</span>
                                        {mode === 'multiple_agents' && swarmSummary.workersTotal > 0 && <span className="text-emerald-500">• distributed active</span>}
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => void loadRuntimeFooter()}
                                    title="Refresh runtime"
                                >
                                    <RefreshCw className="size-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Right Panel: Event Feed & Active Agent */}
                <aside className="w-80 border-l border-border/50 bg-sidebar/5 flex flex-col overflow-hidden">
                    <div className="flex items-center h-12 px-4 border-b border-border/50 bg-background/50">
                        <Activity className="size-4 mr-2 text-primary" />
                        <span className="text-sm font-semibold">Hive Monitor</span>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 flex flex-col gap-4">
                            {/* Swarm Controller Card */}
                            <Card className="border-border/50 bg-background/50 shadow-none">
                                <CardContent className="p-3 flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                        <Cpu className="size-5 text-primary-foreground" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold truncate">Swarm Controller</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-medium text-muted-foreground truncate">
                                                {swarmSummary.workersTotal > 0
                                                    ? `${swarmSummary.activeWorkers} active / ${swarmSummary.workersTotal} workers`
                                                    : sortedAgentStatusRows.length > 0
                                                        ? `${sortedAgentStatusRows.filter((row) => row.status === 'active').length} active agents`
                                                        : 'Searching agents...'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20">
                                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runtime Info</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Status</span>
                                        <Badge variant={status === 'running' ? "default" : "secondary"} className="h-5 text-[9px] uppercase tracking-wider">{status || 'idle'}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Parallel Execution</span>
                                        <span className={`text-[11px] font-bold ${swarmSummary.activeWorkers >= 2 ? 'text-emerald-500' : 'text-muted-foreground/50'}`}>
                                            {swarmSummary.activeWorkers >= 2 ? 'ENABLED' : 'DISABLED'}
                                        </span>
                                    </div>
                                    <Separator className="bg-border/30" />
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">Queue Pressure</span>
                                            <span className="font-mono font-bold">{swarmSummary.queuePressure}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">Unhealthy Nodes</span>
                                            <span className={`font-mono font-bold ${swarmSummary.unhealthyWorkers > 0 ? 'text-destructive' : ''}`}>{swarmSummary.unhealthyWorkers}</span>
                                        </div>
                                    </div>
                                    {projectSwitchFeedback && (
                                         <div className="mt-2 p-2 rounded bg-amber-500/5 border border-amber-500/20 flex flex-col gap-1.5 text-[10px]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-amber-500/70 font-medium">Project Migration</span>
                                                <Badge variant="outline" className="h-4 border-amber-500/30 text-amber-500 text-[8px]">{projectSwitchFeedback.switching ? 'IN_PROGRESS' : 'READY'}</Badge>
                                            </div>
                                            <div className="flex items-center justify-between opacity-70">
                                                <span>Spawned: {projectSwitchFeedback.spawned}</span>
                                                <span>Demoted: {projectSwitchFeedback.demoted}</span>
                                            </div>
                                         </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>
                            {/* Agent Runtime Board */}
                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden flex flex-col min-h-0">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20 flex-row items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent Registry</CardTitle>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] text-muted-foreground opacity-60">Project Agents: {sortedAgentStatusRows.length}</span>
                                            <Separator orientation="vertical" className="h-2" />
                                            <span className="text-[9px] text-muted-foreground opacity-60">Hot: {projectRosterSummary.hot}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] opacity-50">{sortedAgentStatusRows.length}</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[180px]">
                                        <div className="flex flex-col">
                                            {sortedAgentStatusRows.length === 0 ? (
                                                <div className="p-6 text-center text-[10px] text-muted-foreground italic opacity-50">
                                                    No agents in active scope
                                                </div>
                                            ) : (
                                                sortedAgentStatusRows.map((row) => (
                                                    <div key={row.slug} className="flex items-start gap-3 p-3 border-b border-border/10 hover:bg-muted/30 transition-colors group">
                                                        <div className="relative mt-0.5">
                                                            <div className={`size-8 rounded-lg bg-muted flex items-center justify-center border border-border/50 group-hover:border-primary/30 transition-all shadow-sm`}>
                                                                <Bot className="size-4 opacity-50" />
                                                            </div>
                                                            <div className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-background ${
                                                                row.isPaused ? 'bg-muted-foreground/30' : 
                                                                row.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                                            }`} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1 gap-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-[11px] font-bold truncate tracking-tight">{row.callsign || row.title}</span>
                                                                <Badge variant="outline" className="h-3.5 px-1 text-[8px] font-mono opacity-40 lowercase">{row.status}</Badge>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] text-muted-foreground truncate opacity-60 font-mono italic">@{row.slug}</span>
                                                                <span className="text-[10px] text-foreground/70 truncate leading-tight">
                                                                    {row.isPaused ? 'Lifecycle paused' : (row.currentTask || 'Warming up context...')}
                                                                </span>
                                                            </div>
                                                            {row.delegatedFrom && (
                                                                <div className="flex items-center gap-1 text-[9px] text-amber-500/70 font-medium">
                                                                    <ArrowUpRight className="size-2.5" />
                                                                    <span>Delegated from {row.delegatedFrom}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Worker Runtime Board */}
                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden flex flex-col min-h-0">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20 flex-row items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Worker Nodes</CardTitle>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] text-muted-foreground opacity-60">Total: {projectRosterSummary.totalWorkers}</span>
                                            <Separator orientation="vertical" className="h-2" />
                                            <span className="text-[9px] text-emerald-500 font-medium">Hot: {projectRosterSummary.hot}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] opacity-50">{projectScopedWorkers.length}</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[240px]">
                                        <div className="flex flex-col">
                                            {projectScopedWorkers.length === 0 ? (
                                                <div className="p-8 text-center flex flex-col items-center gap-2 opacity-30">
                                                    <Server className="size-6" />
                                                    <span className="text-[10px] italic">No worker runtime data.</span>
                                                </div>
                                            ) : (
                                                projectScopedWorkers.map((worker) => {
                                                    const heartbeatFresh = worker.heartbeatFreshness === 'fresh';
                                                    const heartbeatStale = worker.heartbeatFreshness === 'stale';
                                                    return (
                                                        <div key={`${worker.projectId}:${worker.agentSlug}:${worker.workerId}`} 
                                                             className="flex flex-col p-3 border-b border-border/10 hover:bg-muted/30 transition-colors">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`size-1.5 rounded-full ${heartbeatFresh ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : heartbeatStale ? 'bg-amber-500' : 'bg-destructive'}`} />
                                                                    <span className="text-[11px] font-bold font-mono tracking-tighter">{worker.workerId.slice(0, 12)}</span>
                                                                </div>
                                                                <Badge variant={worker.executionState === 'active' ? 'default' : 'secondary'} className="h-4 px-1 text-[8px] font-bold uppercase">
                                                                    {worker.executionState}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-muted-foreground font-medium">{worker.agentSlug}</span>
                                                                    <span className={`font-mono ${worker.availabilityState === 'hot' ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>{worker.availabilityState}</span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 mt-0.5">
                                                                    <div className="bg-muted/30 rounded p-1.5 border border-border/30">
                                                                        <div className="text-[8px] uppercase tracking-tighter text-muted-foreground mb-0.5">Task / Stage</div>
                                                                        <div className="text-[10px] font-mono truncate">{worker.assignedTask?.taskId || 'n/a'}</div>
                                                                    </div>
                                                                    <div className="bg-muted/30 rounded p-1.5 border border-border/30">
                                                                        <div className="text-[8px] uppercase tracking-tighter text-muted-foreground mb-0.5">Heartbeat</div>
                                                                        <div className="text-[10px] font-mono">{Math.max(0, Math.floor(worker.heartbeatAgeMs / 1000))}s ago</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Queue & Dispatch Board */}
                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden flex flex-col min-h-0">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20 flex-row items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queue & Dispatch</CardTitle>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px] text-muted-foreground opacity-60">Length: {queueSnapshot.queueLength}</span>
                                            <Separator orientation="vertical" className="h-2" />
                                            <span className="text-[9px] text-muted-foreground opacity-60">Avg Latency: {dispatchLatencySummary.avgMs ?? 'n/a'}ms</span>
                                        </div>
                                    </div>
                                    {dispatchLatencySummary.warning && <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-bounce">LAG</Badge>}
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[200px]">
                                        <div className="flex flex-col">
                                            {queueSnapshot.waiting.length === 0 ? (
                                                <div className="p-8 text-center flex flex-col items-center gap-2 opacity-30">
                                                    <Clock className="size-6" />
                                                    <span className="text-[10px] italic">Queue is currently clear.</span>
                                                </div>
                                            ) : (
                                                queueSnapshot.waiting.slice(0, 15).map((task) => (
                                                    <div key={`queue-${task.taskId}`} className="flex items-center gap-3 p-2.5 border-b border-border/10">
                                                        <div className="size-7 rounded-md bg-muted flex items-center justify-center border border-border/30">
                                                            <Hash className="size-3.5 opacity-40" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold truncate">{task.taskId}</span>
                                                                <span className="text-[9px] text-muted-foreground font-mono">{new Date(task.updatedAt).toLocaleTimeString([], {hour12: false})}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge variant="outline" className="h-3.5 px-1 text-[8px] font-mono opacity-50 uppercase">{task.agentSlug}</Badge>
                                                                <span className="text-[9px] text-muted-foreground">stage: {task.stageId}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                                <CardFooter className="p-2 border-t border-border/10 bg-muted/5 flex items-center justify-between text-[9px] text-muted-foreground opacity-60">
                                    <span>Tracked: {queueSnapshot.totalTracked}</span>
                                    <span>Completed: {queueSnapshot.completed.length}</span>
                                </CardFooter>
                            </Card>

                            {/* Worker Lifecycle Timeline */}
                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden flex flex-col min-h-0">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20 flex-row items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifecycle Events</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] opacity-50">{workerLifecycleTimeline.length}</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[180px]">
                                        <div className="flex flex-col p-3 gap-3">
                                            {workerLifecycleTimeline.length === 0 ? (
                                                <div className="p-4 text-center text-[10px] text-muted-foreground italic opacity-50">
                                                    No lifecycle events yet.
                                                </div>
                                            ) : (
                                                workerLifecycleTimeline.map((row) => (
                                                    <div key={`lifecycle-${row.id}`} className="flex flex-col gap-0.5 border-b border-border/5 pb-2 last:border-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`size-1.5 rounded-full ${row.type.includes('failed') ? 'bg-destructive' : 'bg-emerald-500'}`} />
                                                                <span className="text-[10px] font-bold text-foreground/80">{row.type}</span>
                                                            </div>
                                                            <span className="text-[8px] text-muted-foreground font-mono opacity-50">{new Date(row.at).toLocaleTimeString([], {hour12: false})}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground opacity-60 ml-3.5">
                                                            <span className="font-mono">@{row.workerId.slice(0, 6)}</span>
                                                            <Separator orientation="vertical" className="h-1.5" />
                                                            <span className="truncate italic">{row.from} {'->'} {row.to}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Worker Debug Logs */}
                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden flex flex-col min-h-0">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20 flex-row items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runtime Debug</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] opacity-50">v2.1 live</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[200px]">
                                        <div className="flex flex-col p-3 gap-3">
                                            {workerDebugRows.length === 0 ? (
                                                <div className="p-4 text-center text-[10px] text-muted-foreground italic opacity-50">
                                                    Waiting for debug signals...
                                                </div>
                                            ) : (
                                                workerDebugRows.map((row) => (
                                                    <div key={`debug-${row.id}`} className="flex flex-col gap-0.5 border-b border-border/5 pb-2 last:border-0 overflow-hidden">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <Badge variant="outline" className="h-3 px-1 text-[7px] font-mono opacity-60 bg-muted/30">{row.type.split('.').pop()}</Badge>
                                                            <span className="text-[8px] text-muted-foreground font-mono opacity-40">{new Date(row.at).toLocaleTimeString([], {hour12: false})}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 items-center">
                                                            <span className="text-[9px] font-mono font-bold opacity-80 text-primary/80">@{row.workerId.slice(0, 4)}</span>
                                                            <span className="text-[9px] text-muted-foreground italic truncate max-w-[150px]">
                                                                {row.summary || `Executing stage ${row.stageId || 'n/a'}`}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {row.agentSlug && <span className="text-[7px] bg-muted px-1 rounded opacity-50">AGENT:{row.agentSlug}</span>}
                                                            {row.tool && <span className="text-[7px] text-emerald-500 font-mono">TOOL:{row.tool}</span>}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Execution Trace Per Worker */}
                            <Card className="border-border/50 bg-background/50 shadow-none overflow-hidden flex flex-col min-h-0">
                                <CardHeader className="py-2 px-3 border-b border-border/30 bg-muted/20 flex-row items-center justify-between">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Execution Load</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] opacity-50">REAL_TIME</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[200px]">
                                        <div className="grid gap-3 p-3">
                                            {workerTraceRows.length === 0 ? (
                                                <div className="p-4 text-center text-[10px] text-muted-foreground italic opacity-50">
                                                    No execution activity detected.
                                                </div>
                                            ) : (
                                                workerTraceRows.map((row) => (
                                                    <div key={`trace-${row.agentSlug}-${row.workerId}`} className="bg-muted/10 rounded border border-border/20 p-2 group hover:bg-muted/20 transition-colors">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[10px] font-bold text-foreground/80">{row.agentSlug}</span>
                                                            </div>
                                                            <span className="text-[8px] text-muted-foreground font-mono opacity-40">@{row.workerId.slice(0, 6)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            <div className="flex flex-col items-center bg-background/50 rounded py-1 border border-border/10 shadow-sm">
                                                                <span className="text-[7px] uppercase tracking-tighter text-muted-foreground font-bold">Steps</span>
                                                                <span className="text-[10px] font-mono font-bold">{row.steps}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center bg-background/50 rounded py-1 border border-border/10 shadow-sm">
                                                                <span className="text-[7px] uppercase tracking-tighter text-muted-foreground font-bold">Tools</span>
                                                                <span className="text-[10px] font-mono font-bold">{row.toolCalls}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center bg-background/50 rounded py-1 border border-primary/20 shadow-sm bg-primary/5">
                                                                <span className="text-[7px] uppercase tracking-tighter text-primary/80 font-bold">LLM</span>
                                                                <span className="text-[10px] font-mono font-bold text-primary">{row.llmCalls}</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 flex items-center justify-end gap-1 text-[7px] text-muted-foreground italic opacity-40">
                                                            <span>Last activity: {new Date(row.lastAt).toLocaleTimeString([], {hour12: false})}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Session Replay Control */}
                            <Card className="border-dashed border-border group bg-muted/5 hover:bg-muted/10 transition-colors">
                                <CardContent className="p-3 py-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Rewind className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Session Replay</span>
                                        </div>
                                        <Badge variant="secondary" className="h-4 px-1 text-[8px] opacity-60">ADMIN</Badge>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className={`h-7 px-2 text-[10px] flex-1 transition-all ${chatEventRenderMode === 'raw' ? 'bg-amber-500/10 text-amber-500 border-amber-500/40' : 'hover:border-primary/50 text-muted-foreground'}`}
                                                onClick={() => setChatEventRenderMode('raw')}
                                            >
                                                RAW
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className={`h-7 px-2 text-[10px] flex-1 transition-all ${chatEventRenderMode === 'formatted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40' : 'hover:border-primary/50 text-muted-foreground'}`}
                                                onClick={() => setChatEventRenderMode('humanized')}
                                            >
                                                FORMATTED
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={`h-7 px-2 text-[10px] flex-1 ${replayEnabled ? 'text-cyan-500 border-cyan-500/30 bg-cyan-500/5' : 'text-muted-foreground opacity-50'}`}
                                                onClick={() => {
                                                    setReplayEnabled((v) => !v);
                                                    setReplayPlaying(false);
                                                    setReplayIndex(0);
                                                }}
                                            >
                                                {replayEnabled ? 'Disable' : 'Enable'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-[10px] flex-1 text-muted-foreground disabled:opacity-20"
                                                disabled={!replayEnabled || activeEvents.length === 0}
                                                onClick={() => setReplayPlaying((v) => !v)}
                                            >
                                                {replayPlaying ? 'Pause' : 'Play'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-[10px] text-muted-foreground"
                                                disabled={!replayEnabled}
                                                onClick={() => {
                                                    setReplayPlaying(false);
                                                    setReplayIndex(0);
                                                }}
                                            >
                                                Reset
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between px-1 border-t border-border/10 pt-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] text-muted-foreground uppercase opacity-40">Speed</span>
                                                <select
                                                    className="bg-transparent text-[10px] font-mono outline-none cursor-pointer text-primary"
                                                    value={replaySpeedMs}
                                                    onChange={(e) => setReplaySpeedMs(Number(e.target.value))}
                                                    disabled={!replayEnabled}
                                                >
                                                    <option value={150}>FAST</option>
                                                    <option value={350}>NORM</option>
                                                    <option value={700}>SLOW</option>
                                                </select>
                                            </div>
                                            {replayEnabled && (
                                                <span className="text-[10px] font-mono text-muted-foreground opacity-60">
                                                    {Math.min(replayIndex, activeEvents.length)}/{activeEvents.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="mt-4 p-3 border-t border-border/10">
                                <StreamRenderer events={replayVisibleEvents} />
                                <ObservabilityPanels events={replayVisibleEvents} selectedProject={selectedProject} />
                                <div ref={feedEndRef} />
                            </div>
                        </div>
                    </ScrollArea>
                </aside>
            </main>


            {isProjectModalOpen && (
                <div className="cockpit-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
                    <div className="cockpit-modal-panel">
                        <div>
                            <h3 id="project-modal-title" className="cockpit-modal-title">Add Project</h3>
                            <p className="cockpit-modal-subtitle">Choose local folder onboarding or repository-first onboarding.</p>
                        </div>
                        <div className="cockpit-modal-form">
                            <label htmlFor="project-onboarding-mode" className="cockpit-modal-label">Onboarding Mode</label>
                            <select
                                id="project-onboarding-mode"
                                value={projectOnboardingMode}
                                onChange={(e) => setProjectOnboardingMode(e.target.value as 'local' | 'repository')}
                                className="cockpit-modal-input"
                            >
                                <option value="repository">Repository-first</option>
                                <option value="local">Local directory</option>
                            </select>
                            {projectOnboardingMode === 'repository' && (
                                <>
                                    <label htmlFor="project-repository-url" className="cockpit-modal-label">Repository URL</label>
                                    <input
                                        id="project-repository-url"
                                        value={projectRepositoryUrl}
                                        onChange={(e) => setProjectRepositoryUrl(e.target.value)}
                                        placeholder="https://github.com/org/repo.git"
                                        className="cockpit-modal-input"
                                    />
                                    <label htmlFor="project-repo-auth-mode" className="cockpit-modal-label">Repository Auth</label>
                                    <select
                                        id="project-repo-auth-mode"
                                        value={projectRepositoryAuthMode}
                                        onChange={(e) => setProjectRepositoryAuthMode(e.target.value as 'none' | 'oauth' | 'pat')}
                                        className="cockpit-modal-input"
                                    >
                                        <option value="oauth">OAuth</option>
                                        <option value="pat">PAT</option>
                                        <option value="none">None (read-only)</option>
                                    </select>
                                    <label htmlFor="project-bootstrap-mode" className="cockpit-modal-label">Bootstrap Mode</label>
                                    <select
                                        id="project-bootstrap-mode"
                                        value={projectBootstrapMode}
                                        onChange={(e) => setProjectBootstrapMode(e.target.value as 'none' | 'auto-template' | 'read-only')}
                                        className="cockpit-modal-input"
                                    >
                                        <option value="read-only">Read-only default</option>
                                        <option value="auto-template">Auto template</option>
                                        <option value="none">None</option>
                                    </select>
                                </>
                            )}
                            {projectOnboardingMode === 'local' && (
                                <>
                            <label htmlFor="project-directory-input" className="cockpit-modal-label">Directory Path</label>
                            <div className="cockpit-modal-row">
                                <input
                                    id="project-directory-input"
                                    value={projectDirectory}
                                    onChange={(e) => setProjectDirectory(e.target.value)}
                                    placeholder="/Users/.../your-project"
                                    className="cockpit-modal-input"
                                />
                                <button type="button" className="cockpit-modal-secondary" onClick={handleChooseDirectory}>
                                    Choose Folder
                                </button>
                            </div>
                            <div className="cockpit-modal-hint">
                                Project name: <strong>{getFolderNameFromPath(projectDirectory) || '—'}</strong>
                            </div>
                            <label htmlFor="agent-context-directory-input" className="cockpit-modal-label">Agent Files Directory</label>
                            <input
                                id="agent-context-directory-input"
                                value={projectAgentContextDirectory}
                                onChange={(e) => setProjectAgentContextDirectory(e.target.value)}
                                placeholder="/Users/.../agent-files-repo"
                                className="cockpit-modal-input"
                            />
                            <div className="cockpit-modal-hint">
                                Absolute path to directory containing <code>AGENTS.md</code> and agent/pipeline docs.
                            </div>
                                </>
                            )}
                            <label htmlFor="plane-project-select" className="cockpit-modal-label">Plane Project</label>
                            <select
                                id="plane-project-select"
                                value={selectedPlaneProjectId}
                                onChange={(e) => setSelectedPlaneProjectId(e.target.value)}
                                disabled={createPlaneProject || isLoadingPlaneProjects || planeProjectsConfigured === false}
                                className="cockpit-modal-input"
                            >
                                <option value="">
                                    {isLoadingPlaneProjects
                                        ? 'Loading Plane projects...'
                                        : planeProjectsConfigured === false
                                            ? 'Plane is not configured'
                                            : 'Select existing Plane project'}
                                </option>
                                {planeProjectOptions.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name} ({project.identifier})
                                    </option>
                                ))}
                            </select>
                            <label className="cockpit-modal-label">
                                <input
                                    type="checkbox"
                                    checked={createPlaneProject}
                                    onChange={(e) => {
                                        const nextValue = e.target.checked;
                                        setCreatePlaneProject(nextValue);
                                        if (nextValue) setSelectedPlaneProjectId('');
                                    }}
                                />
                                Create new Plane project (explicit)
                            </label>
                        </div>
                        <div className="cockpit-modal-actions">
                            <button
                                type="button"
                                className="cockpit-modal-secondary"
                                onClick={() => {
                                    resetProjectModalState();
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="cockpit-modal-primary"
                                disabled={
                                    (
                                        projectOnboardingMode === 'local'
                                            ? (!isAbsolutePath(projectDirectory) || !isAbsolutePath(projectAgentContextDirectory))
                                            : projectRepositoryUrl.trim().length === 0
                                    ) || (!selectedPlaneProjectId && !createPlaneProject)
                                }
                                onClick={() => { void handleAddNewProject(); }}
                            >
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isChainModalOpen && (
                <div className="cockpit-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="chain-modal-title">
                    <div className="cockpit-modal-panel">
                        <div>
                            <h3 id="chain-modal-title" className="cockpit-modal-title">Create New Chain</h3>
                            <p className="cockpit-modal-subtitle">Start a new chat chain in the current project or as unbound context.</p>
                        </div>
                        <div className="cockpit-modal-form">
                            <label htmlFor="chain-label-input" className="cockpit-modal-label">Chain Name</label>
                            <input
                                id="chain-label-input"
                                value={newChainLabel}
                                onChange={(e) => setNewChainLabel(e.target.value)}
                                placeholder="For example: Sprint planning sync"
                                className="cockpit-modal-input"
                            />
                            <label htmlFor="chain-scope-select" className="cockpit-modal-label">Scope</label>
                            <select
                                id="chain-scope-select"
                                value={newChainScope}
                                onChange={(e) => setNewChainScope(e.target.value as 'current' | 'unbound')}
                                disabled={!selectedProject}
                                className="cockpit-modal-input"
                            >
                                <option value="current">{selectedProject ? `Current project (${selectedProject})` : 'Current project unavailable'}</option>
                                <option value="unbound">Unbound chain (no project)</option>
                            </select>
                        </div>
                        <div className="cockpit-modal-actions">
                            <button
                                type="button"
                                className="cockpit-modal-secondary"
                                onClick={() => {
                                    setIsChainModalOpen(false);
                                    setNewChainLabel('');
                                    setNewChainScope('current');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="cockpit-modal-primary"
                                disabled={!selectedProject && newChainScope === 'current'}
                                onClick={() => { void handleAddNewChain(); }}
                            >
                                Create Chain
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
