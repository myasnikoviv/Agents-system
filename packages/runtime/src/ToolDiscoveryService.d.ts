import { AgentProfile } from './registries/AgentRegistry';
export interface ToolDefinition {
    name: string;
    description: string;
    schema?: any;
}
export interface DiscoveryOptions {
    agent: AgentProfile;
    pipeline: {
        id: string;
        currentStageId: string;
    };
    guardrails: {
        blockedActions: string[];
    };
}
export declare class ToolDiscoveryService {
    /**
     * Resolves the set of tools available for the given run context.
     */
    static resolveTools(options: DiscoveryOptions): Promise<ToolDefinition[]>;
    private static addGlobalTools;
    private static applyPolicy;
}
