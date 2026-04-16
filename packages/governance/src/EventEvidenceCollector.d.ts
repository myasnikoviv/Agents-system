export interface EventEvidenceSnapshot {
    total: number;
    stageStarted: number;
    agentStarted: number;
    handoffs: number;
}
export declare function collectEventEvidence(runId: string): Promise<EventEvidenceSnapshot>;
