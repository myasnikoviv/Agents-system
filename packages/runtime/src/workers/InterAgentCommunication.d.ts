interface HandoffInput {
    runId: string;
    projectId: string;
    chainId: string;
    pipelineId: string;
    fromAgentId: string;
    toAgentId: string;
    toStageId: string;
    toStageTitle: string;
    taskId?: string;
}
interface SharedStateScope {
    projectId: string;
    chainId: string;
    fromAgentId: string;
    toAgentId: string;
}
export declare class InterAgentCommunication {
    static publishHandoff(input: HandoffInput): Promise<{
        handoffId: string;
        handedOffAt: string;
    }>;
    static writeSharedState(scope: SharedStateScope, data: Record<string, any>): void;
    static readSharedState(scope: SharedStateScope): Record<string, any>;
    static clearSharedState(): void;
    static listHandoffs(): Array<Record<string, any>>;
}
export {};
