import { RuntimeEvent } from '../StreamRenderer';

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
}

export interface ObservabilityState {
    pipeline: string;
    stage: string;
    nextStage: string;
    blockingGates: string;
    approvalRequired: boolean;
    approvalReason: string;
}

export interface GitContext {
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
}

export interface RuntimeFooterState {
    executionTarget: 'local' | 'remote';
    accessPolicy: 'full-access' | 'sandbox';
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
}

export interface CanonicalSseEvent {
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

export interface CatalogState {
    agents: string[];
    pipelines: string[];
    skills: string[];
}

export interface RailProject {
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

export interface RailThread {
    id: string;
    label: string;
    updatedAt: string;
}

export interface PlaneProjectOption {
    id: string;
    name: string;
    identifier: string;
}

export interface AgentRegistryEntry {
    slug: string;
    title: string;
    callsign: string;
    sourcePath?: string;
    available?: boolean;
}

export type AgentLiveStatus = 'active' | 'standby' | 'unavailable';

export interface AgentRuntimeStatus {
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

export interface WorkerHealthRow {
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

export interface SwarmSummaryState {
    workersTotal: number;
    activeWorkers: number;
    standbyWorkers: number;
    unhealthyWorkers: number;
    queuePressure: number;
}

export interface ProjectSwitchFeedback {
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

export interface QueueTaskSnapshot {
    taskId: string;
    stageId: string;
    agentSlug: string;
    status: 'pending' | 'assigned' | 'completed';
    queuedAt: number;
    assignedAt: number | null;
    updatedAt: number;
}

export interface PromptToken {
    kind: 'pipeline' | 'agent' | 'skill';
    value: string;
}

export interface MetaAutocompleteState {
    open: boolean;
    kind: ('pipeline' | 'agent' | 'skill') | null;
    query: string;
    rangeStart: number;
    rangeEnd: number;
    selectedIndex: number;
    suggestions: string[];
}

export interface WorkScopeState {
    cycles: Array<{ id: string; name: string }>;
    stories: Array<{ id: string; key: string; name: string; stateId: string }>;
    tasks: Array<{ id: string; key: string; name: string; stateId: string }>;
    items: Array<{ id: string; key: string; name: string; stateId: string }>;
    selected: { cycleId: string; storyId: string };
    statusSummary: { total: number; done: number; inProgress: number; todo: number };
}

export interface UploadedAttachment {
    id: string;
    originalName: string;
    relativePath: string;
    mimeType: string;
    size: number;
    createdAt: string;
}

export type RuntimeProvider = 'claude-cli' | 'codex-cli' | 'openhands-sdk';
export type ChatEventRenderMode = 'humanized' | 'raw' | 'both';
