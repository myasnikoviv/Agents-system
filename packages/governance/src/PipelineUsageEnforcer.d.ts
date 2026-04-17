/**
 * ENF-006 — Pipeline Usage Soft Gate
 *
 * Ensures every user request maps to exactly one pipeline before any other action.
 * Maps to PI-ENF-006 global rules.
 */
export interface PipelineUsageInput {
    ticketId: string;
    runId?: string;
    chainId?: string;
    pipelineId: string;
    isExplicit: boolean;
    confidence: number;
}
export declare function logPipelineUsageGate(input: PipelineUsageInput): void;
