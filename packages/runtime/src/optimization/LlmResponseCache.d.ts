export declare function buildLlmResponseCacheKey(input: {
    pipelineId: string;
    stage: any;
    agentSlug: string;
    userInput: string;
}): string;
export declare function getCachedLlmResponse(input: {
    workspacePath: string;
    key: string;
    stage: any;
    nowMs?: number;
}): {
    hit: boolean;
    value?: string;
};
export declare function setCachedLlmResponse(input: {
    workspacePath: string;
    key: string;
    value: string;
    nowMs?: number;
}): void;
