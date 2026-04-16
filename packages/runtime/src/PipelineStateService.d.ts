export interface PipelineStateCard {
    pipeline: string;
    mode: string;
    currentStage: string;
    completedStages: string[];
    nextStage: string;
    currentOwner: string;
    nextOwner: string;
    ticket: string;
    thread: string;
    lastUpdated: string;
    blockingGates: string;
    evidenceLinks: string;
    activeBranch: string;
    worktreePath: string;
    preflightToken: string;
    editorSource: string;
}
export declare function readPipelineStateCard(ticket: string, threadId: string): Promise<PipelineStateCard | null>;
export declare function upsertPipelineStateCard(input: {
    pipeline: string;
    mode: string;
    stage: string;
    completedStages: string[];
    nextStage: string;
    currentOwner: string;
    nextOwner: string;
    ticket: string;
    threadId: string;
    blockingGates?: string;
    evidenceLinks?: string;
    activeBranch?: string;
    worktreePath?: string;
    preflightToken?: string;
    editorSource?: string;
}): Promise<string>;
export declare function validateResumeConsistency(input: {
    ticket: string;
    threadId: string;
    expectedStage?: string;
    expectedNextStage?: string;
    expectedBranch?: string;
    expectedWorktreePath?: string;
    expectedPreflightToken?: string;
    expectedEditorSource?: string;
}): Promise<{
    ok: true;
} | {
    ok: false;
    reason: string;
}>;
