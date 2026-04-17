export interface DiscoveryPipelineStep {
    index: number;
    role: string;
    roleSlug: string;
    description: string;
}
export interface DiscoveryPipelineDefinition {
    id: string;
    name: string;
    steps: DiscoveryPipelineStep[];
}
export declare class PipelineDiscovery {
    private static cache;
    static loadPipeline(pipelineId: string): Promise<DiscoveryPipelineDefinition>;
    private static parsePipelineMarkdown;
    private static resolveRoleSlug;
    static getNextStep(definition: DiscoveryPipelineDefinition, currentStatus: string): DiscoveryPipelineStep | null;
    private static statusToStepIndex;
}
