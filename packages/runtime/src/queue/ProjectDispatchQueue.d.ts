export interface DispatchQueueTask {
    taskId: string;
    runId: string;
    projectId: string;
    chainId: string;
    pipelineId: string;
    stageId: string;
    agentSlug: string;
    payload?: Record<string, any>;
    enqueuedAt: number;
}
export interface DlqQueueTask extends DispatchQueueTask {
    dlqId: string;
    failedAt: number;
    failureReason: string;
    sourceTaskId: string;
    retriesExhausted: number;
}
export declare class ProjectDispatchQueue {
    static moveToDlq(input: {
        task: DispatchQueueTask;
        reason: string;
        retriesExhausted: number;
        actorId?: string;
    }): DlqQueueTask;
    static listDlq(projectId?: string): DlqQueueTask[];
    static requeueDlq(input: {
        projectId: string;
        dlqId: string;
        actorId?: string;
    }): DispatchQueueTask | null;
    private static getTaskByIdAsync;
    static enqueue(task: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): DispatchQueueTask;
    static pickup(projectId: string, agentSlug: string, options?: {
        environmentId?: string;
    }): DispatchQueueTask | null;
    static pickupForWorker(projectId: string, agentSlug: string, workerId: string): DispatchQueueTask | null;
    static depth(projectId: string, agentSlug?: string, options?: {
        environmentId?: string;
    }): number;
    static snapshot(projectId?: string, options?: {
        environmentId?: string;
    }): Record<string, number>;
    static listTasks(projectId?: string): DispatchQueueTask[];
    static reassignTask(input: {
        projectId: string;
        taskId: string;
        toAgentSlug: string;
        actorId?: string;
    }): DispatchQueueTask | null;
    static retryTask(input: {
        projectId: string;
        taskId: string;
        actorId?: string;
    }): DispatchQueueTask | null;
    static cancelTask(input: {
        projectId: string;
        taskId: string;
        actorId?: string;
    }): DispatchQueueTask | null;
    static setTaskPriority(input: {
        projectId: string;
        taskId: string;
        priority: number;
        actorId?: string;
    }): DispatchQueueTask | null;
    static clearProject(projectId: string): number;
    static clear(): void;
    static enqueueAsync(task: Omit<DispatchQueueTask, 'taskId' | 'enqueuedAt'>): Promise<DispatchQueueTask>;
    static pickupAsync(projectId: string, agentSlug: string, options?: {
        environmentId?: string;
    }): Promise<DispatchQueueTask | null>;
    static pickupForWorkerAsync(projectId: string, agentSlug: string, workerId: string, options?: {
        environmentId?: string;
    }): Promise<DispatchQueueTask | null>;
    static depthAsync(projectId: string, agentSlug?: string, options?: {
        environmentId?: string;
    }): Promise<number>;
    static listTasksAsync(projectId?: string): Promise<DispatchQueueTask[]>;
    static snapshotAsync(projectId?: string, options?: {
        environmentId?: string;
    }): Promise<Record<string, number>>;
    static reassignTaskAsync(input: {
        projectId: string;
        taskId: string;
        toAgentSlug: string;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static retryTaskAsync(input: {
        projectId: string;
        taskId: string;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static cancelTaskAsync(input: {
        projectId: string;
        taskId: string;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static setTaskPriorityAsync(input: {
        projectId: string;
        taskId: string;
        priority: number;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
    static clearProjectAsync(projectId: string): Promise<number>;
    static clearAsync(): Promise<void>;
    static moveToDlqAsync(input: {
        task: DispatchQueueTask;
        reason: string;
        retriesExhausted: number;
        actorId?: string;
    }): Promise<DlqQueueTask>;
    static listDlqAsync(projectId?: string): Promise<DlqQueueTask[]>;
    static requeueDlqAsync(input: {
        projectId: string;
        dlqId: string;
        actorId?: string;
    }): Promise<DispatchQueueTask | null>;
}
