import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type { RuntimeEvent } from '../StreamRenderer';
import type {
    ChatMessage,
    ObservabilityState,
    GitContext,
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
import { apiUrl, fetchJsonSafe, fetchJsonStrict } from '../../../lib/http';
import { useCockpitEvents } from '../hooks/useCockpitEvents';
import { useCockpitProject } from '../hooks/useCockpitProject';

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
    setPromptTokens: Dispatch<SetStateAction<PromptToken[]>>;
    setUploadedAttachments: Dispatch<SetStateAction<UploadedAttachment[]>>;
    setSelectedProject: (id: string) => void;
    setSelectedThread: (id: string) => void;
    setRailCollapsed: (collapsed: boolean) => void;
    setChatEventRenderMode: (mode: ChatEventRenderMode) => void;
    setRuntimePickerOpen: (picker: any) => void;
    setIsProjectModalOpen: (open: boolean) => void;
    setIsChainModalOpen: (open: boolean) => void;
    setScopeCardPinned: (pinned: boolean) => void;
    setSelectedScopeItemIds: Dispatch<SetStateAction<string[]>>;
    setReplayEnabled: Dispatch<SetStateAction<boolean>>;
    setReplayPlaying: Dispatch<SetStateAction<boolean>>;
    setReplayIndex: Dispatch<SetStateAction<number>>;
    setReplaySpeedMs: (ms: number) => void;
    handleSendMessage: () => Promise<void>;
    handleDeleteThread: (projectId: string, threadId: string) => Promise<void>;
    handleCreateChain: (
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
        }
    ) => Promise<boolean>;
    handleApprove: () => Promise<void>;
    planeTicketUrl: (ticketId: string) => string | null;
    loadRuntimeFooter: () => Promise<void>;
    handleDeleteProject: (projectId: string) => Promise<void>;
    syncProjectRuntimeContext: (projectId: string) => Promise<void>;
}

const CockpitContext = createContext<CockpitContextType | undefined>(undefined);

export const CockpitProvider = ({ children }: { children: ReactNode }) => {
    // UI State
    const [input, setInput] = useState('');
    const [promptTokens, setPromptTokens] = useState<PromptToken[]>([]);
    const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
    const [status, setStatus] = useState<string>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAwaitingAgentReply, setIsAwaitingAgentReply] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [currentTicketId] = useState<string | null>(null);
    const [chatEventRenderMode, setChatEventRenderMode] = useState<ChatEventRenderMode>(() => {
        const stored = localStorage.getItem(CHAT_EVENT_RENDER_MODE_KEY);
        return (stored === 'raw' || stored === 'both') ? stored as ChatEventRenderMode : 'humanized';
    });
    const [railCollapsed, setRailCollapsed] = useState(false);
    const [observability, setObservability] = useState<ObservabilityState | null>(null);
    const [gitContext, setGitContext] = useState<GitContext | null>(null);
    const [workScope, setWorkScope] = useState<WorkScopeState>({
        cycles: [], stories: [], tasks: [], items: [],
        selected: { cycleId: '', storyId: '' },
        statusSummary: { total: 0, done: 0, inProgress: 0, todo: 0 },
    });
    const [selectedScopeItemIds, setSelectedScopeItemIds] = useState<string[]>([]);
    const [scopeCardPinned, setScopeCardPinned] = useState(true);
    const [runtimeFooter, setRuntimeFooter] = useState<RuntimeFooterState>({ executionTarget: 'local', accessPolicy: 'full-access', activeBranch: 'main', worktreePath: '', preflightToken: null });
    const [providerMessage, setProviderMessage] = useState<string | null>(null);
    const [runtimePickerOpen, setRuntimePickerOpen] = useState<string | null>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isChainModalOpen, setIsChainModalOpen] = useState(false);
    const [replayEnabled, setReplayEnabled] = useState(false);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replaySpeedMs, setReplaySpeedMs] = useState(350);

    // Business Logic Hooks
    const {
        railProjects,
        railThreadsByProject,
        selectedProject,
        setSelectedProject,
        selectedThread,
        setSelectedThread,
        messagesByThread,
        agentRegistry,
        appendMessagesToThread,
        appendAgentMessageIfChanged,
        handleCreateChain: handleCreateChainRaw,
        handleDeleteThread,
        handleDeleteProject,
        syncProjectRuntimeContext: syncProjectRaw
    } = useCockpitProject(setProviderMessage);

    const activeThreadKey = selectedThread || currentThreadId || '__unbound_thread__';

    const {
        activeEvents,
        swarmSummary,
        agentStatusRows,
        sortedAgentStatusRows,
        resourcePressure
    } = useCockpitEvents(activeThreadKey, agentRegistry, appendAgentMessageIfChanged);

    const messages = messagesByThread[activeThreadKey] || [];

    const replayVisibleEvents = useMemo(() => {
        if (!replayEnabled) return activeEvents;
        return activeEvents.slice(0, Math.min(replayIndex, activeEvents.length));
    }, [activeEvents, replayEnabled, replayIndex]);

    // Work Scope loading
    useEffect(() => {
        const loadWorkScope = async () => {
            const params = new URLSearchParams({ mode: 'all', cycleId: workScope.selected.cycleId || '', storyId: workScope.selected.storyId || '' });
            const data = await fetchJsonSafe<any>(`/api/cockpit/work-scope?${params.toString()}`);
            if (data?.success) {
                setWorkScope({
                    cycles: data.cycles || [], stories: data.stories || [], tasks: data.tasks || [], items: data.items || [],
                    selected: data.selected || { cycleId: '', storyId: '' },
                    statusSummary: data.statusSummary || { total: 0, done: 0, inProgress: 0, todo: 0 },
                });
            }
        };
        void loadWorkScope();
    }, [workScope.selected.cycleId, workScope.selected.storyId]);

    const handleSendMessage = async () => {
        if (!input.trim() || isProcessing) return;
        const threadIdToUse = selectedThread || `thread_${Date.now()}`;
        if (!selectedThread) {
            setSelectedThread(threadIdToUse);
            setCurrentThreadId(threadIdToUse);
        }

        const userMsg = input.trim();
        setInput('');
        appendMessagesToThread(threadIdToUse, [{ id: Date.now().toString(), role: 'user', content: userMsg, timestamp: new Date() }]);
        setIsProcessing(true);
        setIsAwaitingAgentReply(true);
        setStatus('running');

        try {
            const res = await fetch(apiUrl('/api/chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, projectId: selectedProject, threadId: threadIdToUse, attachments: uploadedAttachments }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus(data.status || 'running');
                if (data.observability) setObservability(data.observability);
                if (data.gitContext) setGitContext(data.gitContext);
                if (data.message) {
                    appendAgentMessageIfChanged(threadIdToUse, data.message, new Date());
                    setIsAwaitingAgentReply(false);
                }
            }
        } catch (e) {
            console.error("Chat error", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApprove = async () => {
        setIsProcessing(true);
        try {
            await fetchJsonStrict(apiUrl('/api/chat/approve'), { method: 'POST', body: JSON.stringify({ threadId: activeThreadKey }) });
        } catch (e) {
            console.error("Approval error", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateChain = (projectIdArg?: string, labelArg?: string, options?: any) =>
        handleCreateChainRaw(setRuntimeFooter, projectIdArg, labelArg, options);

    const syncProjectRuntimeContext = (projectId: string) => syncProjectRaw(projectId, setRuntimeFooter);

    const loadRuntimeFooter = async () => {
        const data = await fetchJsonSafe<any>(apiUrl('/api/cockpit/runtime-footer'));
        if (data?.success) setRuntimeFooter(data.footer);
    };

    const planeTicketUrl = (id: string) => id ? `https://plane.cloud/ticket/${id}` : null;

    const value = {
        input, setInput, messages, activeEvents, promptTokens, setPromptTokens, uploadedAttachments, setUploadedAttachments,
        status, selectedProject, selectedThread, currentThreadId, currentTicketId, isProcessing, isAwaitingAgentReply,
        chatEventRenderMode, railCollapsed, railProjects, railThreadsByProject, swarmSummary, swarmWorkers: [],
        agentStatusRows, sortedAgentStatusRows, projectScopedWorkers: [], projectRosterSummary: {},
        queueSnapshot: { waiting: [], assigned: [], completed: [], totalTracked: 0, queueLength: 0 },
        taskWorkerMapping: [], workerLifecycleTimeline: [], workerDebugRows: [], workerTraceRows: [], resourcePressure,
        dispatchLatencySummary: { avgMs: 124, warning: false }, observability, gitContext, workScope, scopeCardPinned, selectedScopeItemIds,
        runtimeFooter, providerMessage, runtimePickerOpen, showCatalogPicker: false, showPlusMenu: false,
        isProjectModalOpen, isChainModalOpen, replayEnabled, replayPlaying, replayIndex, replaySpeedMs, replayVisibleEvents,
        setSelectedProject, setSelectedThread, setRailCollapsed, setChatEventRenderMode, setRuntimePickerOpen,
        setIsProjectModalOpen, setIsChainModalOpen, setScopeCardPinned, setSelectedScopeItemIds,
        setReplayEnabled, setReplayPlaying, setReplayIndex, setReplaySpeedMs,
        handleSendMessage, handleDeleteThread, handleDeleteProject, handleCreateChain, handleApprove, planeTicketUrl, loadRuntimeFooter,
        syncProjectRuntimeContext
    };

    return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
};

export const useCockpit = () => {
    const context = useContext(CockpitContext);
    if (!context) throw new Error('useCockpit must be used within a CockpitProvider');
    return context;
};
