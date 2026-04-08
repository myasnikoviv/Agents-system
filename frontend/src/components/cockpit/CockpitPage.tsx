import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Mic, Send, Square, Cpu, Activity, LayoutDashboard, Terminal, Settings, PanelLeftClose, PanelLeftOpen, Globe2, ChevronDown, Plus, PencilLine, Folder, FolderPlus, Laptop, ShieldCheck, GitBranch, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArtifactRenderer } from './ArtifactRenderer';
import { apiUrl, fetchJsonSafe } from '../../lib/http';
import { StreamRenderer, type RuntimeEvent } from './StreamRenderer';
import './CockpitPage.css';
const RUNTIME_MODE_KEY = 'cockpit.runtime.mode.v1';

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

const toRenderableMarkdown = (raw: string): string =>
    String(raw || '').replace(
        /<execute_tool>\s*([\s\S]*?)\s*<\/execute_tool>/gi,
        (_match, inner) => `\n\`\`\`bash\n${String(inner || '').trim()}\n\`\`\`\n`
    );

export function CockpitPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'mock' | 'linear' | 'multiple_agents'>(() => {
        const stored = localStorage.getItem(RUNTIME_MODE_KEY);
        if (stored === 'mock' || stored === 'linear' || stored === 'multiple_agents') return stored;
        return 'multiple_agents';
    });
    const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>({});
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
    const [swarmSummary, setSwarmSummary] = useState<SwarmSummaryState>({
        workersTotal: 0,
        activeWorkers: 0,
        standbyWorkers: 0,
        unhealthyWorkers: 0,
        queuePressure: 0,
    });

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
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectDirectory, setProjectDirectory] = useState('');
    const [projectAgentContextDirectory, setProjectAgentContextDirectory] = useState('');
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
    const agentRegistryRef = useRef<AgentRegistryEntry[]>([]);

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
    const activeThreadKeyRef = useRef(activeThreadKey);

    useEffect(() => {
        activeThreadKeyRef.current = activeThreadKey;
    }, [activeThreadKey]);

    useEffect(() => {
        agentRegistryRef.current = agentRegistry;
    }, [agentRegistry]);

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

    const sseInitialized = useRef(false);

    useEffect(() => {
        if (sseInitialized.current) return;
        sseInitialized.current = true;

        const url = apiUrl('/api/events/stream');
        const source = new EventSource(url);

        source.onopen = () => {
            console.log('[SSE] Connected to', url);
        };

        source.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data) as CanonicalSseEvent;
                if (data.type === 'connected') return;
                const event = normalizeSseEvent(data);
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
                                lastUpdated: event.timestamp || new Date().toISOString(),
                                delegatedFrom,
                            },
                        };
                    });
                }

                if (eventType === 'run.started') {
                    setStatus('running');
                    if (event.pipeline_run_id) setActiveRunId(String(event.pipeline_run_id));
                }
                if (eventType === 'run.cancelled') {
                    setStatus('cancelled');
                    setIsAwaitingAgentReply(false);
                    setIsProcessing(false);
                }
                if (eventType === 'run.completed') {
                    setStatus('completed');
                    setIsAwaitingAgentReply(false);
                    setIsProcessing(false);
                }
                if (eventType === 'run.failed') {
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
                    let chatText: string | null = null;
                    const stageRaw = String(event.payload?.stageId || event.source_stage || '').trim();
                    const stageTitleRaw = String(event.payload?.stageTitle || event.payload?.toStageTitle || '').trim();
                    const stageLabel = stageTitleRaw || (/^\d+$/.test(stageRaw) ? `step #${stageRaw}` : (stageRaw || 'n/a'));
                    if (eventType === 'swarm_stage_completed') {
                        const stageMessage = String(event.payload?.message || '').trim();
                        if (stageMessage) {
                            chatText = stageMessage;
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
                    } else if (eventType === 'run.completed' && threadKey === activeThreadKeyRef.current) {
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

                    if (chatText) {
                        seenChatEventIdsRef.current.add(eventId);
                        if (seenChatEventIdsRef.current.size > 500) {
                            const first = seenChatEventIdsRef.current.values().next().value as string | undefined;
                            if (first) seenChatEventIdsRef.current.delete(first);
                        }
                        appendAgentMessageIfChanged(threadKey, chatText, new Date(event.timestamp || Date.now()));
                    }
                }

            } catch (err) {
                console.error('SSE Error parsing data:', err);
            }
        };

        source.onerror = (err) => {
            console.error('SSE connection error:', err);
            source.close();
            sseInitialized.current = false;
        };

        return () => {
            console.log('[SSE] Closing connection');
            source.close();
            sseInitialized.current = false;
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

    useEffect(() => {
        let cancelled = false;
        const pollWorkerHealth = async () => {
            const projectQuery = selectedProject ? `?projectId=${encodeURIComponent(selectedProject)}` : '';
            const data = await fetchJsonSafe<{ success?: boolean; workers?: WorkerHealthRow[] }>(
                `/api/cockpit/swarm/workers${projectQuery}`,
            );
            if (cancelled || !data?.success || !Array.isArray(data.workers)) return;
            setAgentRuntime((prev) => {
                const next: Record<string, AgentRuntimeStatus> = { ...prev };
                for (const worker of data.workers || []) {
                    const slug = String(worker.agentSlug || '').trim();
                    if (!slug) continue;
                    const display = resolveAgentDisplay(slug);
                    const existing = next[slug] || {
                        slug,
                        title: display.title,
                        callsign: display.callsign,
                        status: 'standby' as AgentLiveStatus,
                        currentStage: 'n/a',
                        currentTask: 'n/a',
                        currentIssue: 'n/a',
                        threadId: selectedThread || currentThreadId || 'n/a',
                        lastUpdated: '',
                    };
                    const status: AgentLiveStatus =
                        worker.heartbeatFreshness === 'dead' || worker.enabled === false
                            ? 'unavailable'
                            : worker.executionState === 'active'
                                ? 'active'
                                : 'standby';
                    const hbSec = Math.max(0, Math.floor(Number(worker.heartbeatAgeMs || 0) / 1000));
                    const taskLabel = worker.assignedTask?.stageId
                        ? `${worker.assignedTask.stageId}`
                        : worker.assignedTask?.taskId
                            ? `${worker.assignedTask.taskId}`
                            : '';
                    next[slug] = {
                        ...existing,
                        title: display.title,
                        callsign: display.callsign,
                        status,
                        currentTask: status === 'active'
                            ? `worker:${worker.workerId} ${taskLabel ? `[${taskLabel}] ` : ''}(${hbSec}s ago)`
                            : 'n/a',
                        currentStage: String(worker.rawLifecycleState || existing.currentStage || 'n/a'),
                        lastUpdated: new Date().toISOString(),
                    };
                }
                return next;
            });
        };
        void pollWorkerHealth();
        const timer = window.setInterval(() => void pollWorkerHealth(), 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [selectedProject, selectedThread, currentThreadId]);

    useEffect(() => {
        let cancelled = false;
        const pollSwarmSummary = async () => {
            const projectQuery = selectedProject ? `?projectId=${encodeURIComponent(selectedProject)}` : '';
            const data = await fetchJsonSafe<{ success?: boolean; summary?: SwarmSummaryState }>(
                `/api/cockpit/swarm/summary${projectQuery}`,
            );
            if (cancelled || !data?.success || !data.summary) return;
            setSwarmSummary({
                workersTotal: Number(data.summary.workersTotal || 0),
                activeWorkers: Number(data.summary.activeWorkers || 0),
                standbyWorkers: Number(data.summary.standbyWorkers || 0),
                unhealthyWorkers: Number(data.summary.unhealthyWorkers || 0),
                queuePressure: Number(data.summary.queuePressure || 0),
            });
        };
        void pollSwarmSummary();
        const timer = window.setInterval(() => void pollSwarmSummary(), 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [selectedProject]);

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
        localStorage.setItem(RUNTIME_MODE_KEY, mode);
    }, [mode]);

    useEffect(() => {
        const syncMode = () => {
            const stored = localStorage.getItem(RUNTIME_MODE_KEY);
            if (stored === 'mock' || stored === 'linear' || stored === 'multiple_agents') setMode(stored);
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === RUNTIME_MODE_KEY) syncMode();
        };
        window.addEventListener('focus', syncMode);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('focus', syncMode);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

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
                if (data.message && mode !== 'multiple_agents') {
                    appendAgentMessageIfChanged(responseThreadId || threadIdToUse, data.message, new Date());
                    setIsAwaitingAgentReply(false);
                }
                // 2. For legacy direct/linear modes, display logs
                else if (Array.isArray(data.logs) && data.logs.length > 0 && mode !== 'multiple_agents') {
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
                
                // Final refined transcription fallback (Whisper)
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
                    console.error("Transcribe fallback failed:", e);
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
        options?: { projectLabel?: string; worktreePath?: string; agentContextPath?: string; planeProjectId?: string; createPlaneProject?: boolean },
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
        setSelectedPlaneProjectId('');
        setCreatePlaneProject(false);
        setPlaneProjectOptions([]);
        setPlaneProjectsConfigured(null);
        setIsLoadingPlaneProjects(false);
    };

    const handleAddNewProject = async () => {
        const absoluteDirectory = projectDirectory.trim();
        const absoluteAgentContextDirectory = projectAgentContextDirectory.trim();
        if (!isAbsolutePath(absoluteDirectory)) {
            setProviderMessage('Project directory must be an absolute path.');
            return;
        }
        if (!isAbsolutePath(absoluteAgentContextDirectory)) {
            setProviderMessage('Agent files directory must be an absolute path.');
            return;
        }
        if (!selectedPlaneProjectId && !createPlaneProject) {
            setProviderMessage('Select an existing Plane project or enable "Create new Plane project".');
            return;
        }
        const folderName = getFolderNameFromPath(absoluteDirectory);
        if (!folderName) return;
        const projectId = getUniqueProjectId(slugifyProjectId(folderName));
        const created = await handleCreateChain(projectId, 'New chat', {
            projectLabel: folderName,
            worktreePath: absoluteDirectory || undefined,
            agentContextPath: absoluteAgentContextDirectory || undefined,
            planeProjectId: selectedPlaneProjectId || undefined,
            createPlaneProject,
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

    const runtimeModeLabel = mode === 'mock' ? 'Mock' : mode === 'linear' ? 'Quasi-linear' : 'Multiple agents';

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
        <div className="cockpit-container">
            {/* Header */}
            <header className="cockpit-header">
                <div className="header-title">
                    <LayoutDashboard size={24} />
                    Agent Cockpit
                    {providerMessage && <span className="provider-feedback">{providerMessage}</span>}
                </div>
                <div className="header-actions">
                    <button type="button" className="header-icon-btn" onClick={() => navigate('/cockpit/settings/general')} title="Settings" aria-label="Settings">
                        <Settings size={15} />
                    </button>
                </div>
            </header>

            <main className="cockpit-main">
                <aside className={`rail-panel ${railCollapsed ? 'collapsed' : ''}`}>
                    <div className="rail-head">
                        <span>{railCollapsed ? 'AC' : 'Agent Cockpit'}</span>
                        <button type="button" className="rail-toggle" onClick={() => setRailCollapsed((p) => !p)} title={railCollapsed ? 'Open sidebar' : 'Hide sidebar'} aria-label={railCollapsed ? 'Open sidebar' : 'Hide sidebar'}>
                            {railCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
                        </button>
                    </div>
                    {!railCollapsed && (
                        <div className="rail-body">
                            <div className="rail-top-actions">
                                <button
                                    type="button"
                                    className="rail-top-btn"
                                    onClick={() => {
                                        if (!selectedProject) {
                                                    openProjectModal();
                                            return;
                                        }
                                        setIsChainModalOpen(true);
                                    }}
                                >
                                    <PencilLine size={13} />
                                    <span>Новий ланцюжок</span>
                                </button>
                                <button type="button" className="rail-top-btn" onClick={openProjectModal}>
                                    <FolderPlus size={13} />
                                    <span>Add new project</span>
                                </button>
                            </div>
                            <div className="rail-section-head">
                                <span>Projects</span>
                            </div>
                            <div className="rail-project-list">
                                {railProjects.length === 0 ? (
                                    <div className="rail-empty-state">
                                        <div className="rail-empty-title">No projects yet</div>
                                        <div className="rail-empty-text">Create a project to start chats in a selected worktree.</div>
                                        <button type="button" className="rail-empty-action" onClick={openProjectModal}>
                                            <FolderPlus size={13} />
                                            <span>Add project</span>
                                        </button>
                                    </div>
                                ) : railProjects.map((project) => (
                                    <div key={project.id} className="rail-project-node">
                                        <div className="rail-item-row">
                                            <button
                                                type="button"
                                                className={`rail-project-btn ${selectedProject === project.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedProject(project.id);
                                                    setSelectedThread((railThreadsByProject[project.id] || [])[0]?.id || '');
                                                    void syncProjectRuntimeContext(project.id);
                                                }}
                                            >
                                                <Folder size={13} />
                                                <span className="rail-project-label">{project.label}</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="rail-delete-btn"
                                                title="Delete project"
                                                aria-label={`Delete project ${project.label}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void handleDeleteProject(project.id);
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        {selectedProject === project.id && (
                                            <div className="rail-thread-list nested">
                                                {(railThreadsByProject[project.id] || []).map((thread) => (
                                                    <div key={thread.id} className="rail-item-row rail-item-row-thread">
                                                        <button
                                                            type="button"
                                                            className={`rail-thread-btn ${selectedThread === thread.id ? 'active' : ''}`}
                                                            onClick={() => setSelectedThread(thread.id)}
                                                        >
                                                            <span className="rail-thread-label">{thread.label}</span>
                                                            <span className="rail-thread-age">{new Date(thread.updatedAt).toLocaleDateString()}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rail-delete-btn"
                                                            title="Delete chat"
                                                            aria-label={`Delete chat ${thread.label}`}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                void handleDeleteThread(project.id, thread.id);
                                                            }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
                {/* Left Panel: Chat Input */}
                <section className="left-panel">
                    <div className="panel-title">
                        <Terminal size={20} />
                        Command Interface
                    </div>

                    <div className="chat-container">
                        {observability && (
                            <div className="observability-card">
                                <div className="observability-title">Pipeline Observability</div>
                                <div className="observability-grid">
                                    <span>Pipeline</span><strong>{observability.pipeline}</strong>
                                    <span>Stage</span><strong>{observability.stage}</strong>
                                    <span>Next</span><strong>{observability.nextStage}</strong>
                                    <span>Gates</span><strong>{observability.blockingGates}</strong>
                                    <span>Approval</span><strong>{observability.approvalReason}</strong>
                                </div>
                            </div>
                        )}
                        {(currentTicketId || gitContext) && (
                            <div className="artifact-strip">
                                {currentTicketId && (
                                    <div>
                                        <strong>Ticket:</strong>{' '}
                                        {planeTicketUrl(currentTicketId) ? (
                                            <a href={planeTicketUrl(currentTicketId)!} target="_blank" rel="noreferrer">{currentTicketId}</a>
                                        ) : (
                                            currentTicketId
                                        )}
                                    </div>
                                )}
                                {gitContext?.activeBranch && <div><strong>Branch:</strong> {gitContext.activeBranch}</div>}
                                {gitContext?.worktreePath && <div><strong>Worktree:</strong> {gitContext.worktreePath}</div>}
                                {gitContext?.preflightToken && <div><strong>Preflight:</strong> {gitContext.preflightToken}</div>}
                            </div>
                        )}
                        {scopeCardPinned && workScope.items.length > 0 && (
                            <div className="chat-scope-card">
                                <div className="chat-scope-head">
                                    <div>
                                        <strong>Execution Scope</strong>
                                        <div className="chat-scope-sub">PM checklist: Sprint / Story / Task</div>
                                    </div>
                                    <button type="button" className="context-pill" onClick={() => setScopeCardPinned(false)}>Unpin</button>
                                </div>
                                <div className="health-grid">
                                    <span>Total</span><strong>{workScope.statusSummary.total}</strong>
                                    <span>Done</span><strong className="health-ok">{workScope.statusSummary.done}</strong>
                                    <span>In Progress</span><strong>{workScope.statusSummary.inProgress}</strong>
                                    <span>Todo</span><strong>{workScope.statusSummary.todo}</strong>
                                </div>
                                <div className="scope-multiselect">
                                    {workScope.items.slice(0, 10).map((it) => {
                                        const checked = selectedScopeItemIds.includes(it.id);
                                        return (
                                            <label key={`chat-scope-${it.id}`} className="scope-check-item">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() =>
                                                        setSelectedScopeItemIds((prev) =>
                                                            checked ? prev.filter((id) => id !== it.id) : [...prev, it.id]
                                                        )
                                                    }
                                                />
                                                <span><strong>{it.key}</strong> {it.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {!scopeCardPinned && workScope.items.length > 0 && (
                            <button type="button" className="scope-pin-restore" onClick={() => setScopeCardPinned(true)}>
                                Pin Scope Checklist
                            </button>
                        )}

                        {messages.length === 0 && status === 'idle' ? (
                            <div style={{opacity: 0.5, fontStyle: 'italic', margin: 'auto'}}>
                                No tasks yet. How can the Swarm assist you today?
                            </div>
                        ) : null}
                        
                        {messages.map((m) => (
                            <div key={m.id} className={`chat-bubble ${m.role}`}>
                                <div className="chat-meta">
                                    <span>{m.role === 'user' ? 'Me' : 'Agent'}</span>
                                    <span>{m.timestamp.toLocaleTimeString()}</span>
                                </div>
                                <div className="chat-markdown">
                                    <ArtifactRenderer content={toRenderableMarkdown(m.content)} />
                                </div>
                            </div>
                        ))}

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

                    <div className="task-input-wrapper">
                        {showCatalogPicker && (
                            <div className="composer-catalog-popover">
                                <div className="catalog-section">
                                    <strong>Agents</strong>
                                    <div className="catalog-chip-list">
                                        {catalog.agents.length === 0 && <span className="catalog-list">No data</span>}
                                        {catalog.agents.map((item) => (
                                            <button
                                                key={`agent-pop-${item}`}
                                                className="catalog-chip"
                                                onClick={() => appendCommand('agent', item)}
                                            >
                                                @{item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="catalog-section">
                                    <strong>Pipelines</strong>
                                    <div className="catalog-chip-list">
                                        {catalog.pipelines.length === 0 && <span className="catalog-list">No data</span>}
                                        {catalog.pipelines.map((item) => (
                                            <button
                                                key={`pipeline-pop-${item}`}
                                                className="catalog-chip"
                                                onClick={() => appendCommand('pipeline', item)}
                                            >
                                                /{item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="catalog-section">
                                    <strong>Skills</strong>
                                    <div className="catalog-chip-list">
                                        {catalog.skills.length === 0 && <span className="catalog-list">No data</span>}
                                        {catalog.skills.map((item) => (
                                            <button
                                                key={`skill-pop-${item}`}
                                                className="catalog-chip"
                                                onClick={() => appendCommand('skill', item)}
                                            >
                                                #{item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {promptTokens.length > 0 && (
                            <div className="composer-chip-strip">
                                {promptTokens.map((token) => (
                                    <button
                                        key={`${token.kind}:${token.value}`}
                                        className="composer-chip"
                                        onClick={() => removeToken(token.kind, token.value)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            rehydrateTokenIntoInput(token);
                                            removeToken(token.kind, token.value);
                                        }}
                                        title="Remove token"
                                    >
                                        {token.kind}: {token.value} ×
                                    </button>
                                ))}
                            </div>
                        )}
                        <textarea 
                            ref={textareaRef}
                            className="task-textarea"
                            placeholder="Describe the feature, issue, or strategy idea..."
                            value={input}
                            disabled={isProcessing || isAwaitingAgentReply}
                            onChange={e => {
                                const value = e.target.value;
                                const cursor = e.target.selectionStart ?? value.length;
                                setInput(value);
                                updateAutocomplete(value, cursor);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleTokenDrop}
                            onKeyDown={e => {
                                if (metaAutocomplete.open) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setMetaAutocomplete((prev) => ({
                                            ...prev,
                                            selectedIndex: (prev.selectedIndex + 1) % prev.suggestions.length,
                                        }));
                                        return;
                                    }
                                    if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setMetaAutocomplete((prev) => ({
                                            ...prev,
                                            selectedIndex: prev.selectedIndex === 0 ? prev.suggestions.length - 1 : prev.selectedIndex - 1,
                                        }));
                                        return;
                                    }
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        applyAutocompleteChoice();
                                        return;
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        closeAutocomplete();
                                        return;
                                    }
                                }
                                if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                                    e.preventDefault();
                                    setShowCatalogPicker((prev) => !prev);
                                    return;
                                }
                                if (e.key === 'Backspace' && !input.trim() && promptTokens.length > 0) {
                                    e.preventDefault();
                                    const last = promptTokens[promptTokens.length - 1];
                                    removeToken(last.kind, last.value);
                                    return;
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={2}
                        />
                        {metaAutocomplete.open && (
                            <div className="meta-autocomplete">
                                {metaAutocomplete.suggestions.map((item, idx) => (
                                    <button
                                        key={`${metaAutocomplete.kind}-${item}`}
                                        className={`meta-option ${idx === metaAutocomplete.selectedIndex ? 'active' : ''}`}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => applyAutocompleteChoice(idx)}
                                    >
                                        <span className="meta-prefix">{metaAutocomplete.kind === 'agent' ? '@' : metaAutocomplete.kind === 'pipeline' ? '/' : '#'}</span>
                                        <span>{item}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {ghostText && (
                            <div className="ghost-text-overlay">
                                <span className="ghost-label">Listening:</span> {ghostText}...
                            </div>
                        )}
                        <div className="composer-controls-row">
                            <div className="input-context-selectors">
                                <div className="runtime-picker">
                                    <button
                                        type="button"
                                        className="runtime-picker-btn runtime-inline-btn"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setRuntimePickerOpen((prev) => (prev === 'voice' ? null : 'voice'));
                                        }}
                                        aria-label="Voice language"
                                        title="Voice language"
                                    >
                                        <Globe2 size={12} />
                                        <span>{voiceLang === 'auto' ? 'Auto' : voiceLang.toUpperCase()}</span>
                                        <ChevronDown size={12} />
                                    </button>
                                    {runtimePickerOpen === 'voice' && (
                                        <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                            {([
                                                { id: 'auto', label: 'Auto' },
                                                { id: 'uk', label: 'UA' },
                                                { id: 'en', label: 'EN' },
                                            ] as const).map((item) => (
                                                <button
                                                    key={`voice-${item.id}`}
                                                    type="button"
                                                    className={`runtime-picker-option ${voiceLang === item.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setVoiceLang(item.id);
                                                        setRuntimePickerOpen(null);
                                                    }}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="runtime-picker">
                                    <button
                                        type="button"
                                        className="runtime-picker-btn"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setRuntimePickerOpen((prev) => (prev === 'provider' ? null : 'provider'));
                                        }}
                                        aria-label="Provider"
                                    >
                                        <span>{selectedProvider}</span>
                                        <ChevronDown size={12} />
                                    </button>
                                    {runtimePickerOpen === 'provider' && (
                                        <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                            {(['claude-cli', 'codex-cli', 'openhands-sdk'] as const).map((provider) => (
                                                <button
                                                    key={`provider-${provider}`}
                                                    type="button"
                                                    className={`runtime-picker-option ${selectedProvider === provider ? 'active' : ''}`}
                                                    onClick={() => {
                                                        const fallbackModel = providerModelPresets[provider]?.[0] || 'auto';
                                                        setSelectedProvider(provider);
                                                        setSelectedModel(fallbackModel);
                                                        setRuntimePickerOpen(null);
                                                        void applyRuntimeSelection(provider, fallbackModel);
                                                    }}
                                                >
                                                    {provider}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="runtime-picker">
                                    <button
                                        type="button"
                                        className="runtime-picker-btn"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setRuntimePickerOpen((prev) => (prev === 'model' ? null : 'model'));
                                        }}
                                        aria-label="Model"
                                    >
                                        <span>{selectedModel}</span>
                                        <ChevronDown size={12} />
                                    </button>
                                    {runtimePickerOpen === 'model' && (
                                        <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                            {(providerModelPresets[selectedProvider] || ['auto']).map((model) => (
                                                <button
                                                    key={`model-${model}`}
                                                    type="button"
                                                    className={`runtime-picker-option ${selectedModel === model ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedModel(model);
                                                        setRuntimePickerOpen(null);
                                                        void applyRuntimeSelection(selectedProvider, model);
                                                    }}
                                                >
                                                    {model}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="runtime-picker">
                                    <button
                                        type="button"
                                        className={`runtime-picker-btn runtime-inline-btn icon-only ${showPlusMenu ? 'active' : ''}`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setShowPlusMenu((prev) => !prev);
                                        }}
                                        title="Add action"
                                        aria-label="Add action"
                                    >
                                        <Plus size={13} />
                                    </button>
                                    {showPlusMenu && (
                                        <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                            <button
                                                type="button"
                                                className={`runtime-picker-option ${showCatalogPicker ? 'active' : ''}`}
                                                onClick={() => {
                                                    setShowCatalogPicker((prev) => !prev);
                                                    setShowPlusMenu(false);
                                                }}
                                            >
                                                Toggle catalog
                                            </button>
                                            <button
                                                type="button"
                                                className="runtime-picker-option"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setShowPlusMenu(false);
                                                }}
                                            >
                                                Attach file token
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="input-actions">
                                <button 
                                    className={`icon-btn icon-btn-codex-mic ${isRecording ? 'recording' : ''}`}
                                    onClick={toggleRecording}
                                    disabled={isProcessing}
                                    title="Use Voice Input"
                                >
                                    <Mic size={15} />
                                </button>
                                {isProcessing ? (
                                    <button
                                        className="icon-btn icon-btn-codex-send"
                                        onClick={handleStop}
                                        disabled={false}
                                        aria-label="Stop run"
                                        title="Stop run"
                                        style={{ color: '#ef4444' }}
                                    >
                                        <Square size={14} />
                                    </button>
                                ) : (
                                    <button 
                                        className="icon-btn icon-btn-codex-send"
                                        onClick={handleSend}
                                        disabled={(!input.trim() && promptTokens.length === 0) || isRecording || isAwaitingAgentReply}
                                        aria-label="Send task"
                                        title="Send task"
                                    >
                                        <Send size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileAttach}
                        />
                        <div className="composer-shortcuts compact">
                            <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd> catalog
                        </div>
                        <div className="runtime-footer-strip">
                            <div className="runtime-picker">
                                <button
                                    type="button"
                                    className="runtime-footer-item"
                                    title="Execution target"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setRuntimePickerOpen((prev) => (prev === 'target' ? null : 'target'));
                                    }}
                                >
                                    <Laptop size={12} />
                                    <span>{runtimeFooter.executionTarget === 'local' ? 'Локально' : 'Віддалено'}</span>
                                    <ChevronDown size={11} />
                                </button>
                                {runtimePickerOpen === 'target' && (
                                    <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" className={`runtime-picker-option ${runtimeFooter.executionTarget === 'local' ? 'active' : ''}`} onClick={() => { void updateRuntimeFooter({ executionTarget: 'local' }); setRuntimePickerOpen(null); }}>
                                            Локально
                                        </button>
                                        <button type="button" className={`runtime-picker-option ${runtimeFooter.executionTarget === 'remote' ? 'active' : ''}`} onClick={() => { void updateRuntimeFooter({ executionTarget: 'remote' }); setRuntimePickerOpen(null); }}>
                                            Віддалено
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="runtime-picker">
                                <button
                                    type="button"
                                    className="runtime-footer-item runtime-footer-item-accent"
                                    title="Access policy"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setRuntimePickerOpen((prev) => (prev === 'access' ? null : 'access'));
                                    }}
                                >
                                    <ShieldCheck size={12} />
                                    <span>{runtimeFooter.accessPolicy === 'full-access' ? 'Повний доступ' : 'Sandbox'}</span>
                                    <ChevronDown size={11} />
                                </button>
                                {runtimePickerOpen === 'access' && (
                                    <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" className={`runtime-picker-option ${runtimeFooter.accessPolicy === 'full-access' ? 'active' : ''}`} onClick={() => { void updateRuntimeFooter({ accessPolicy: 'full-access' }); setRuntimePickerOpen(null); }}>
                                            Повний доступ
                                        </button>
                                        <button type="button" className={`runtime-picker-option ${runtimeFooter.accessPolicy === 'sandbox' ? 'active' : ''}`} onClick={() => { void updateRuntimeFooter({ accessPolicy: 'sandbox' }); setRuntimePickerOpen(null); }}>
                                            Sandbox
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="runtime-picker">
                                <button
                                    type="button"
                                    className="runtime-footer-item runtime-footer-item-branch"
                                    title="Git branch"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setRuntimePickerOpen((prev) => (prev === 'branch' ? null : 'branch'));
                                    }}
                                >
                                    <GitBranch size={12} />
                                    <span>{runtimeFooter.activeBranch || gitContext?.activeBranch || 'main'}</span>
                                    <ChevronDown size={11} />
                                </button>
                                {runtimePickerOpen === 'branch' && (
                                    <div className="runtime-picker-menu" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" className="runtime-picker-option">
                                            Branch: {runtimeFooter.activeBranch || gitContext?.activeBranch || 'main'}
                                        </button>
                                        <button
                                            type="button"
                                            className="runtime-picker-option"
                                            onClick={() => {
                                                const value = runtimeFooter.worktreePath || gitContext?.worktreePath || '';
                                                if (value) void navigator.clipboard?.writeText(value);
                                                setRuntimePickerOpen(null);
                                            }}
                                        >
                                            {runtimeFooter.worktreePath || gitContext?.worktreePath ? 'Copy worktree path' : 'Worktree path unavailable'}
                                        </button>
                                        <button
                                            type="button"
                                            className="runtime-picker-option"
                                            onClick={() => {
                                                const value = runtimeFooter.preflightToken || gitContext?.preflightToken || '';
                                                if (value) void navigator.clipboard?.writeText(value);
                                                setRuntimePickerOpen(null);
                                            }}
                                        >
                                            {runtimeFooter.preflightToken || gitContext?.preflightToken ? 'Copy preflight token path' : 'Preflight token unavailable'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button type="button" className="runtime-footer-item runtime-footer-item-mode" title="Runtime mode">
                                <span>{runtimeModeLabel}</span>
                            </button>
                            <button type="button" className="runtime-footer-item icon-only" title="Refresh runtime state" onClick={() => void loadRuntimeFooter()}>
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    </div>

                </section>

                {/* Right Panel: Event Feed & Active Agent */}
                <section className="right-panel">
                    <div className="right-panel-sticky">
                        <div className="panel-title">
                            <Activity size={20} />
                            Live Hive State
                        </div>

                        <div className="agent-status-card">
                            <div className="agent-avatar">
                                <Cpu size={24} color={'white'} />
                            </div>
                            <div className="agent-info">
                                <div className="agent-name">Swarm Controller</div>
                                <div className="agent-activity">
                                    {swarmSummary.workersTotal > 0
                                        ? `${swarmSummary.activeWorkers} active / ${swarmSummary.workersTotal} workers`
                                        : sortedAgentStatusRows.length > 0
                                            ? `${sortedAgentStatusRows.filter((row) => row.status === 'active').length} active / ${sortedAgentStatusRows.length} total agents`
                                            : 'No discovered agents yet'}
                                </div>
                            </div>
                        </div>

                        <div className="catalog-card">
                            <div className="catalog-title">Runtime Summary</div>
                            <div className="catalog-section">
                                <span className={statusBadgeClass(status)}>{status || 'idle'}</span>
                                <span>Active thread: {selectedThread || 'n/a'}</span>
                                <span>Ticket: {currentTicketId || 'n/a'}</span>
                                <span>Branch: {gitContext?.activeBranch || runtimeFooter.activeBranch || 'n/a'}</span>
                                <span>Worktree: {gitContext?.worktreePath || runtimeFooter.worktreePath || 'n/a'}</span>
                                <span>Queue pressure: {swarmSummary.queuePressure}</span>
                                <span>Unhealthy workers: {swarmSummary.unhealthyWorkers}</span>
                            </div>
                        </div>
                    </div>

                    <div className="catalog-card">
                        <div className="catalog-title">Agent Runtime Board</div>
                        <div className="agent-board">
                            {sortedAgentStatusRows.length === 0 ? (
                                <div className="agent-board-empty">No agent registry data.</div>
                            ) : (
                                sortedAgentStatusRows.map((row) => (
                                    <div key={row.slug} className="agent-board-row">
                                        <div className={`agent-dot ${row.isPaused ? 'standby' : row.status}`} />
                                        <div className="agent-board-main">
                                            <div className="agent-board-title">{row.callsign || row.title}</div>
                                            <div className="agent-board-sub">{row.slug}</div>
                                            {row.delegatedFrom && (
                                                <div className="inline-flex items-center gap-1 mt-0.5 text-[0.72rem] text-amber-400 opacity-80">
                                                    <span>⤷ delegated from</span>
                                                    <span className="font-medium">{row.delegatedFrom}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="agent-board-meta">
                                            <span>{row.isPaused ? 'paused' : row.status}</span>
                                            <span>stage: {row.currentStage}</span>
                                            <span>task: {row.currentTask}</span>
                                            <span>issue: {row.currentIssue}</span>
                                        </div>
                                        {row.status === 'active' && (
                                            <button
                                                className={`ml-2 px-2 py-0.5 rounded text-[0.72rem] border transition-colors ${
                                                    row.isPaused
                                                        ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                                                        : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                                                }`}
                                                onClick={() => {
                                                    setAgentRuntime((prev) => ({
                                                        ...prev,
                                                        [row.slug]: { ...prev[row.slug], isPaused: !row.isPaused },
                                                    }));
                                                    alert(`${row.isPaused ? 'Resuming' : 'Pausing'} agent: ${row.callsign || row.slug}\n(Mock — backend hook pending)`);
                                                }}
                                            >
                                                {row.isPaused ? 'Resume' : 'Pause'}
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="feed-container">
                        <StreamRenderer events={eventsByThread[activeThreadKey] || []} />
                        <div ref={feedEndRef} />
                    </div>
                </section>
            </main>

            {isProjectModalOpen && (
                <div className="cockpit-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
                    <div className="cockpit-modal-panel">
                        <div>
                            <h3 id="project-modal-title" className="cockpit-modal-title">Add Project Directory</h3>
                            <p className="cockpit-modal-subtitle">Select a working folder. Project name is generated from the folder name.</p>
                        </div>
                        <div className="cockpit-modal-form">
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
                                disabled={!isAbsolutePath(projectDirectory) || !isAbsolutePath(projectAgentContextDirectory) || (!selectedPlaneProjectId && !createPlaneProject)}
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
