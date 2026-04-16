export declare function buildSemanticCacheBucket(input: {
    pipelineId: string;
    agentSlug: string;
    stage: any;
}): string;
export declare function getSemanticCacheHit(input: {
    workspacePath: string;
    bucket: string;
    query: string;
    nowMs?: number;
}): {
    hit: boolean;
    response?: string;
    score?: number;
    threshold: number;
};
export declare function setSemanticCacheEntry(input: {
    workspacePath: string;
    bucket: string;
    prompt: string;
    response: string;
    nowMs?: number;
}): void;
