export interface SelfImprovementInput {
    ticketId: string;
    runId: string;
    pipelineId: string;
    status: string;
    logs: string[];
}
export interface SelfImprovementOutput {
    qualityScore: number;
    findings: string[];
    improvementActions: string[];
    retrospectivePath: string;
    instructionProposalPath: string;
}
export declare function runSelfImprovementLoop(input: SelfImprovementInput): Promise<SelfImprovementOutput>;
