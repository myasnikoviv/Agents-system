export interface WorkerScalingStrategyInput {
    queueDepth: number;
    currentWorkers: number;
    activeWorkers: number;
    now?: number;
    lastScaledAt?: number;
}
export interface WorkerScalingStrategyDecision {
    action: 'scale_up' | 'scale_down' | 'hold';
    desiredWorkers: number;
    reason: string;
    queueDepth: number;
    currentWorkers: number;
    activeWorkers: number;
    cooldownMsRemaining: number;
}
export declare function decideWorkerScaling(input: WorkerScalingStrategyInput): WorkerScalingStrategyDecision;
