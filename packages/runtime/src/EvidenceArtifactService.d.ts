export interface ChatExecutionArtifactInput {
    ticketId: string;
    runId: string;
    pipelineId: string;
    stage: string;
    status: string;
    logs: string[];
    gitContext?: {
        branch?: string;
        worktreePath?: string;
        preflightToken?: string | null;
    };
}
export declare function writeChatExecutionArtifact(input: ChatExecutionArtifactInput): Promise<string>;
