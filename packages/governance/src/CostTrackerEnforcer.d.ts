/**
 * ENF-007 — Cost Tracking Light
 *
 * Tracks resource/token consumption per task/run to provide observability into costs.
 * This is a transparent/passive governance gate.
 */
export interface CostTrackerInput {
    ticketId: string;
    runId: string;
    chainId?: string;
    agentSlug: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}
export declare function logCostTrackerGate(input: CostTrackerInput): void;
