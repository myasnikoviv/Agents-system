export interface AgentPerformanceInput {
    agentSlug: string;
    invocationCount: number;
    successfulTaskCount: number;
    failedTaskCount: number;
    retryTaskCount: number;
    avgTaskDurationMs: number;
    tokenUsage: number;
}
export interface AgentPerformanceScore {
    agentSlug: string;
    score: number;
    successRate: number;
    retryCount: number;
    latencyMs: number;
    tokenUsage: number;
    invocationCount: number;
}
export declare function scoreAgentPerformance(input: AgentPerformanceInput): AgentPerformanceScore;
