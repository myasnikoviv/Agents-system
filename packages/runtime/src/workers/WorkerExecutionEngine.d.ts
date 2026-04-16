export interface WorkerExecutionTaskInput {
    runContext: any;
    timeoutMs: number;
    stageId: string;
    agentSlug: string;
}
export interface WorkerExecutionTaskResult {
    ok: boolean;
    content: string;
    error?: string;
    failed: boolean;
}
export declare class WorkerExecutionEngine {
    static executeTask(input: WorkerExecutionTaskInput): Promise<WorkerExecutionTaskResult>;
}
