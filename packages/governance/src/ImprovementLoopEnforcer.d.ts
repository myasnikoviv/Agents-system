/**
 * ENF-003 — Improvement Loop Soft Gate
 *
 * Checks if the run/sprint included a self-improvement loop (lessons learned, retrospectives).
 * This is a soft gate (log+warn, never block).
 */
export interface ImprovementCheckInput {
    ticket: string;
    runId?: string;
    chainId?: string;
    projectId: string;
    workspacePath: string;
}
export declare function logImprovementLoopGate(input: ImprovementCheckInput): void;
