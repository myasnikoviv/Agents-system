/**
 * ENF-005 — Agent Participation Soft Gate
 *
 * Ensures every active agent participates in the cognitive loop:
 * perceive -> think -> plan -> act -> reflect
 *
 * Since this is a soft gate, it logs a warning if these patterns are missing.
 */
export interface ParticipationCheckInput {
    agentSlug: string;
    ticketId: string;
    runId?: string;
    chainId?: string;
    content: string;
}
export declare function logParticipationGate(input: ParticipationCheckInput): void;
