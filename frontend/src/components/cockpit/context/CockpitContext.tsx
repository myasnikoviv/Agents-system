import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RuntimeEvent } from '../StreamRenderer';
import { 
    ChatMessage, 
    ObservabilityState, 
    GitContext, 
    AgentRegistryEntry, 
    AgentRuntimeStatus, 
    WorkerHealthRow, 
    SwarmSummaryState, 
    ChatEventRenderMode,
    PromptToken,
    RailProject,
    RailThread,
    RuntimeFooterState,
    WorkScopeState,
    UploadedAttachment
} from './types';
import { apiUrl, fetchJsonSafe } from '../../../lib/http';

const CHAT_EVENT_RENDER_MODE_KEY = 'cockpit.chat.event.render.mode.v1';

interface CockpitContextType {
    input: string;
    messages: ChatMessage[];
    activeEvents: RuntimeEvent[];
    promptTokens: PromptToken[];
    uploadedAttachments: UploadedAttachment[];
    status: string;
    selectedProject: string;
    selectedThread: string;
    currentThreadId: string | null;
    currentTicketId: string | null;
    isProcessing: boolean;
    isAwaitingAgentReply: boolean;
    chatEventRenderMode: ChatEventRenderMode;
    railCollapsed: boolean;
    railProjects: RailProject[];
    railThreadsByProject: Record<string, RailThread[]>;
    swarmSummary: SwarmSummaryState;
    swarmWorkers: WorkerHealthRow[];
    agentStatusRows: AgentRuntimeStatus[];
    sortedAgentStatusRows: AgentRuntimeStatus[];
    projectScopedWorkers: WorkerHealthRow[];
    projectRosterSummary: any;
    queueSnapshot: any;
    taskWorkerMapping: any;
    workerLifecycleTimeline: any;
    workerDebugRows: any;
    workerTraceRows: any;
    resourcePressure: any;
    dispatchLatencySummary: any;
    observability: ObservabilityState | null;
    gitContext: GitContext | null;
    workScope: WorkScopeState;
    scopeCardPinned: boolean;
    selectedScopeItemIds: string[];
    runtimeFooter: RuntimeFooterState;
    providerMessage: string | null;
    replayEnabled: boolean;
    replayPlaying: boolean;
    replayIndex: number;
    replaySpeedMs: number;
    replayVisibleEvents: RuntimeEvent[];
    runtimePickerOpen: string | null;
    showCatalogPicker: boolean;
    showPlusMenu: boolean;
    isProjectModalOpen: boolean;
    isChainModalOpen: boolean;
    setInput: (val: string) => void;
    setPromptTokens: React.Dispatch<React.SetStateAction<PromptToken[]>>;
    setUploadedAttachments: React.Dispatch<React.SetStateAction<UploadedAttachment[]>>;
    setSelectedProject: (id: string) => void;
    setSelectedThread: (id: string) => void;
    setRailCollapsed: (collapsed: boolean) => void;
    setChatEventRenderMode: (mode: ChatEventRenderMode) => void;
    setRuntimePickerOpen: (picker: any) => void;
    setIsProjectModalOpen: (open: boolean) => void;
    setIsChainModalOpen: (open: boolean) => void;
    setScopeCardPinned: (pinned: boolean) => void;
    setSelectedScopeItemIds: React.Dispatch<React.SetStateAction<string[]>>;
    setReplayEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setReplayPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setReplayIndex: React.Dispatch<React.SetStateAction<number>>;
    setReplaySpeedMs: (ms: number) => void;
    handleSendMessage: () => Promise<void>;
    handleDeleteThread: (projectId: string, threadId: string) => Promise<void>;
    handleCreateChain: (label: string, scope: string) => Promise<void>;
    handleApprove: () => Promise<void>;
    planeTicketUrl: (ticketId: string) => string | null;
    loadRuntimeFooter: () => Promise<void>;
}

const CockpitContext = createContext<CockpitContextType | undefined>(undefined);

export const CockpitProvider = ({ children }: { children: ReactNode }) => {
    const [input, setInput] = useState('');
    const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>({});
    const [eventsByThread, setEventsByThread] = useState<Record<string, RuntimeEvent[]>>({});
    const [promptTokens, setPromptTokens] = useState<PromptToken[]>([]);
    const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
    const [status, setStatus] = useState<string>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingAgentReply, setIsAwaitingAgentReply] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [chatEventRenderMode, setChatEventRenderMode] = useState<ChatEventRenderMode>(() => {
        const stored = localStorage.getItem(CHAT_EVENT_RENDER_MODE_KEY);
        return (stored === 'raw' || stored === 'both') ? stored as ChatEventRenderMode : 'humanized';
    });
    const [railCollapsed, setRailCollapsed] = useState(false);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedThread, setSelectedThread] = useState('');
    const [railProjects, setRailProjects] = useState<RailProject[]>([]);
    const [railThreadsByProject, setRailThreadsByProject] = useState<Record<string, RailThread[]>>({});
    const [observability, setObservability] = useState<ObservabilityState | null>(null);
    const [gitContext, setGitContext] = useState<GitContext | null>(null);
    const [workScope, setWorkScope] = useState<WorkScopeState>({
        cycles: [], stories: [], tasks: [], items: [],
        selected: { cycleId: '', storyId: '' },
        statusSummary: { total: 0, done: 0, inProgress: 0, todo: 0 },
    });
    const [selectedScopeItemIds, setSelectedScopeItemIds] = useState<string[]>([]);
    const [scopeCardPinned, setScopeCardPinned] = useState(true);
    const [swarmWorkers] = useState<WorkerHealthRow[]>([]);
    const [swarmSummary] = useState<SwarmSummaryState>({ workersTotal: 0, activeWorkers: 0, standbyWorkers: 0, unhealthyWorkers: 0, queuePressure: 0 });
    const [runtimeFooter] = useState<RuntimeFooterState>({ executionTarget: 'local', accessPolicy: 'full-access', activeBranch: 'main', worktreePath: '', preflightToken: null });
    const [providerMessage] = useState<string | null>(null);
    const [runtimePickerOpen, setRuntimePickerOpen] = useState<string | null>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isChainModalOpen, setIsChainModalOpen] = useState(false);
    const [replayEnabled, setReplayEnabled] = useState(false);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replaySpeedMs, setReplaySpeedMs] = useState(350);

    const activeThreadKey = selectedThread || currentThreadId || '__unbound_thread__';
    const messages = messagesByThread[activeThreadKey] || [];
    const activeEvents = eventsByThread[activeThreadKey] || [];
    const replayVisibleEvents = useMemo(() => {
        if (!replayEnabled) return activeEvents;
        return activeEvents.slice(0, Math.min(replayIndex, activeEvents.length));
    }, [activeEvents, replayEnabled, replayIndex]);

    // Initial Data Fetch
    useEffect(() => {
        const loadInitialData = async () => {
            const data = await fetchJsonSafe(apiUrl('/api/rail/catalog'));
            if (data?.projects) {
                setRailProjects(data.projects);
                if (data.projects.length > 0 && !selectedProject) {
                    setSelectedProject(data.projects[0].id);
                }
            }
        };
        void loadInitialData();
    }, []);

    // Load Threads when project changes
    useEffect(() => {
        if (!selectedProject) return;
        const loadThreads = async () => {
            const data = await fetchJsonSafe(apiUrl(`/api/rail/threads?projectId=${selectedProject}`));
            if (data?.threads) {
                setRailThreadsByProject(prev => ({ ...prev, [selectedProject]: data.threads }));
                if (data.threads.length > 0 && !selectedThread) {
                    setSelectedThread(data.threads[0].id);
                }
            }
        };
        void loadThreads();
    }, [selectedProject]);

    const handleSendMessage = async () => { /* Logic... */ };
    const handleApprove = async () => { /* Logic... */ };
    const planeTicketUrl = (id: string) => null; // Impl...
    const handleCreateChain = async () => {};
    const handleDeleteThread = async () => {};
    const loadRuntimeFooter = async () => {};

    // Memos for analytics...
    const agentStatusRows: AgentRuntimeStatus[] = [];
    const sortedAgentStatusRows: AgentRuntimeStatus[] = [];
    const projectScopedWorkers: WorkerHealthRow[] = [];
    const projectRosterSummary = {};
    const queueSnapshot = { waiting: [], assigned: [], completed: [], totalTracked: 0, queueLength: 0 };
    const taskWorkerMapping = [];
    const workerLifecycleTimeline = [];
    const workerDebugRows = [];
    const workerTraceRows = [];
    const resourcePressure = { label: 'normal', className: '' };
    const dispatchLatencySummary = { avgMs: 0, warning: false };

    const value = {
        input, setInput, messages, activeEvents, promptTokens, setPromptTokens, uploadedAttachments, setUploadedAttachments,
        status, selectedProject, selectedThread, currentThreadId, currentTicketId, isProcessing, isAwaitingAgentReply,
        chatEventRenderMode, railCollapsed, railProjects, railThreadsByProject, swarmSummary, swarmWorkers,
        agentStatusRows, sortedAgentStatusRows, projectScopedWorkers, projectRosterSummary, queueSnapshot,
        taskWorkerMapping, workerLifecycleTimeline, workerDebugRows, workerTraceRows, resourcePressure,
        dispatchLatencySummary, observability, gitContext, workScope, scopeCardPinned, selectedScopeItemIds,
        runtimeFooter, providerMessage, runtimePickerOpen, showCatalogPicker: false, showPlusMenu: false,
        isProjectModalOpen, isChainModalOpen, replayEnabled, replayPlaying, replayIndex, replaySpeedMs, replayVisibleEvents,
        setSelectedProject, setSelectedThread, setRailCollapsed, setChatEventRenderMode, setRuntimePickerOpen,
        setIsProjectModalOpen, setIsChainModalOpen, setScopeCardPinned, setSelectedScopeItemIds,
        setReplayEnabled, setReplayPlaying, setReplayIndex, setReplaySpeedMs,
        handleSendMessage, handleDeleteThread, handleCreateChain, handleApprove, planeTicketUrl, loadRuntimeFooter
    };

    return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
};

export const useCockpit = () => {
    const context = useContext(CockpitContext);
    if (!context) throw new Error('useCockpit must be used within a CockpitProvider');
    return context;
};
