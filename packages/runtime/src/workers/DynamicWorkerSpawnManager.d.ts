import { WorkerLifecycleState } from './WorkerLifecycleStateMachine';
import { decideWorkerScaling } from './WorkerScalingStrategy';
export interface RuntimeWorkerRecord {
    tenantId?: string;
    workspaceId?: string;
    projectId: string;
    environmentId?: string;
    agentSlug: string;
    workerType: string;
    workerSlot?: string;
    workerId: string;
    identityKey: string;
    memoryNamespace: string;
    state: WorkerLifecycleState;
    createdAt: number;
    lastUsedAt: number;
    lastHeartbeatAt: number;
    heartbeatCount: number;
    runCount: number;
    invocationCount: number;
    coldStartCount: number;
    totalTaskDurationMs: number;
    totalIdleMs: number;
    successfulTaskCount: number;
    failedTaskCount: number;
    retryTaskCount: number;
    heatMode?: 'hot' | 'cold';
    lastActivationAt?: number;
    lastStandbyAt?: number;
    assignedTask?: {
        taskId: string;
        stageId?: string;
        pipelineId?: string;
        runId: string;
        taskMemoryNamespace?: string;
    } | null;
    manuallyPaused?: boolean;
}
export interface EnsureWorkerInput {
    runId: string;
    projectId: string;
    environmentId?: string;
    tenantId?: string;
    workspaceId?: string;
    chainId: string;
    agentSlug: string;
    workerId?: string;
    taskId?: string;
    stageId?: string;
    pipelineId?: string;
    retryCount?: number;
    workerSlot?: string;
    allowReplica?: boolean;
}
export interface EnsureWorkerResult {
    worker: RuntimeWorkerRecord;
    spawned: boolean;
}
export interface RegisterWorkerInput {
    runId: string;
    chainId: string;
    projectId: string;
    agentSlug: string;
    workerId?: string;
    tenantId?: string;
    workspaceId?: string;
    environmentId?: string;
    workerSlot?: string;
}
export type WorkerControlAction = 'pause' | 'resume' | 'restart' | 'kill';
export declare class DynamicWorkerSpawnManager {
    private static scaleTimestamps;
    private static matchingWorkers;
    private static findWorker;
    private static onTransition;
    private static eligibleEvictionCandidates;
    private static globalEvictionCandidates;
    private static enforcePoolCaps;
    private static transitionState;
    static ensureWorker(input: EnsureWorkerInput, options?: {
        emitEvents?: boolean;
    }): Promise<EnsureWorkerResult>;
    static registerWorker(input: RegisterWorkerInput, options?: {
        emitEvents?: boolean;
    }): Promise<RuntimeWorkerRecord>;
    static releaseToStandby(input: EnsureWorkerInput, options?: {
        emitEvents?: boolean;
    }): Promise<void>;
    static heartbeat(input: EnsureWorkerInput, options?: {
        emitEvents?: boolean;
    }): Promise<void>;
    static markFailed(input: EnsureWorkerInput, reason: string, options?: {
        emitEvents?: boolean;
    }): Promise<void>;
    static snapshot(): RuntimeWorkerRecord[];
    static pruneIdleWorkers(input?: {
        projectId?: string;
        environmentId?: string;
        now?: number;
        idleTimeoutMs?: number;
    }): {
        removed: number;
        keys: string[];
    };
    static applyIdleDemotionPolicy(input?: {
        projectId?: string;
        environmentId?: string;
        now?: number;
        demotionTimeoutMs?: number;
        evictionTimeoutMs?: number;
    }): {
        checked: number;
        demoted: number;
        evicted: number;
        beforeCount: number;
        afterCount: number;
        reducedBy: number;
    };
    static healthSnapshot(input?: {
        projectId?: string;
        environmentId?: string;
        now?: number;
        heartbeatTimeoutMs?: number;
    }): Array<RuntimeWorkerRecord & {
        health: 'healthy' | 'stale' | 'dead';
        heartbeatAgeMs: number;
    }>;
    static utilizationSnapshot(input?: {
        projectId?: string;
        environmentId?: string;
    }): Array<{
        projectId: string;
        environmentId?: string;
        agentSlug: string;
        workerId: string;
        invocationCount: number;
        coldStartCount: number;
        totalTaskDurationMs: number;
        avgTaskDurationMs: number;
        totalIdleMs: number;
        successfulTaskCount: number;
        failedTaskCount: number;
        retryTaskCount: number;
        successRate: number;
        lastHeartbeatAt: number;
        state: WorkerLifecycleState;
    }>;
    static hotColdEfficiencySnapshot(input?: {
        projectId?: string;
        environmentId?: string;
    }): {
        projectId?: string;
        environmentId?: string;
        totals: {
            workers: number;
            hot: number;
            cold: number;
            idle: number;
            active: number;
        };
        estimatedSavings: {
            coldWorkerReductionUnits: number;
            savingsPct: number;
        };
    };
    static workerReuseSnapshot(input?: {
        projectId?: string;
        environmentId?: string;
    }): {
        projectId?: string;
        environmentId?: string;
        totals: {
            workers: number;
            invocations: number;
            coldStarts: number;
            reusedInvocations: number;
        };
        reuse: {
            reuseRate: number;
            spawnOverheadReductionPct: number;
        };
    };
    static controllerContractSnapshot(input?: {
        projectId?: string;
        environmentId?: string;
        now?: number;
        heartbeatTimeoutMs?: number;
    }): Array<{
        projectId: string;
        environmentId?: string;
        agentSlug: string;
        workerId: string;
        enabled: boolean;
        availabilityState: 'hot' | 'cold';
        executionState: 'active' | 'standby';
        rawLifecycleState: WorkerLifecycleState;
        heartbeatFreshness: 'fresh' | 'stale' | 'dead';
        heartbeatAgeMs: number;
        assignedTask: RuntimeWorkerRecord['assignedTask'] | null;
        memoryNamespace: string;
        isPaused: boolean;
        heatMode?: 'hot' | 'cold';
    }>;
    static recommendScaling(input: {
        projectId: string;
        agentSlug: string;
        tenantId?: string;
        workspaceId?: string;
        environmentId?: string;
        queueDepth: number;
        now?: number;
    }): ReturnType<typeof decideWorkerScaling>;
    static autoscaleWorkers(input: {
        runId: string;
        chainId: string;
        projectId: string;
        agentSlug: string;
        tenantId?: string;
        workspaceId?: string;
        environmentId?: string;
        queueDepth: number;
    }): Promise<{
        action: 'scale_up' | 'scale_down' | 'hold';
        desiredWorkers: number;
        beforeWorkers: number;
        afterWorkers: number;
        created: number;
        removed: number;
        reason: string;
    }>;
    static clear(): void;
    /**
     * Emergency cleanup of all worker locks associated with a run.
     * Scans Redis for all locks (with any key/token) and attempts to match them.
     * Also cleans up worker occupancy records in the shared pool.
     */
    static forceReleaseAllLocksForRun(runId: string): Promise<void>;
    static clearAsync(): Promise<void>;
    static setProjectPaused(projectId: string, paused: boolean): void;
    static isProjectPaused(projectId: string): boolean;
    static controlWorker(input: {
        projectId: string;
        tenantId?: string;
        workspaceId?: string;
        environmentId?: string;
        agentSlug?: string;
        workerId?: string;
        action: WorkerControlAction;
        runId?: string;
        chainId?: string;
        emitEvents?: boolean;
    }): Promise<{
        ok: true;
        worker?: RuntimeWorkerRecord;
        removed?: boolean;
    } | {
        ok: false;
        reason: string;
    }>;
    static autoRecoverUnhealthyWorkers(input?: {
        projectId?: string;
        environmentId?: string;
        now?: number;
        heartbeatTimeoutMs?: number;
        runId?: string;
        chainId?: string;
    }): Promise<{
        scanned: number;
        dead: number;
        recovered: number;
    }>;
}
