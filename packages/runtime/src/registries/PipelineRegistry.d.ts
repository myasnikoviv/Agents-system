export interface PipelineStage {
    id: string;
    name: string;
    title: string;
    role: string;
    agent: string;
    description: string;
    instructions: string;
    nextAllowedRoles: string[];
    completionCriteria: string;
}
export interface PipelineDefinition {
    id: string;
    name: string;
    title: string;
    slug: string;
    description?: string;
    stages: PipelineStage[];
    sourcePath: string;
    assetId?: string;
    projectId?: string;
}
export declare class PipelineRegistry {
    private static pipelines;
    static register(definition: PipelineDefinition): void;
    static getPipeline(idOrSlug: string): PipelineDefinition | undefined;
    static getNextStage(pipelineId: string, currentStageId: string): PipelineStage | undefined;
    static getAllPipelines(): PipelineDefinition[];
    static clear(): void;
}
