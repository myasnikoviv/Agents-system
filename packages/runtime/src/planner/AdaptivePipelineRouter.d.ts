export declare function resolveAdaptivePipelineRoute(input: {
    enforcedPipeline?: string;
    selectedPipeline?: string;
    plannerPipeline?: string;
    message: string;
    workspacePath: string;
}): Promise<{
    pipeline: string;
    reason: string;
}>;
