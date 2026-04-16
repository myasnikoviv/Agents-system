export interface ChainPruningPolicy {
    dedupeByStageId?: boolean;
    dedupeConsecutiveByAgent?: boolean;
    dropDisabledStages?: boolean;
    maxStagesPerRun?: number;
}
export interface ChainPruningResult {
    stages: any[];
    beforeCount: number;
    afterCount: number;
    prunedCount: number;
    estimatedLlmCallsBefore: number;
    estimatedLlmCallsAfter: number;
    measurableImprovementPct: number;
    reasons: string[];
}
export declare function pruneExecutionChain(input: {
    workspacePath: string;
    stages: any[];
    maxStagesOverride?: number;
}): ChainPruningResult;
export declare function writeChainPruningReport(workspacePath: string, runId: string, payload: Omit<ChainPruningResult, 'stages'> & {
    pipelineId: string;
}): string;
