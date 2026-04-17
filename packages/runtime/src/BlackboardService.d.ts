import { RunContext, StructuredArtifact } from './context/RunContext';
/**
 * BlackboardService provides a structured, hierarchical memory store
 * backed by Redis (simulated for now, or using Redis MCP).
 *
 * It allows agents to:
 * 1. Publish Shared Facts (long-term knowledge for the current run).
 * 2. Log Decisions (rationale for specific actions).
 * 3. Reference Artifacts (links to generated files/outputs).
 */
export declare class BlackboardService {
    private static redisPrefix;
    /**
     * Generates a hierarchical Redis key based on the Memory Contract Spec.
     * Format: agsys:{tenantId}:{workspaceId}:{projectId}:{environmentId}:{chainId}:{runId}:{entity}
     */
    private static getKey;
    /**
     * Hydrates the memory section of the RunContext from the blackboard.
     */
    static hydrate(context: RunContext): Promise<void>;
    /**
     * Saves a structured artifact to the blackboard.
     */
    static saveArtifact(context: {
        tenantId?: string;
        workspaceId?: string;
        projectId: string;
        environmentId?: string;
        chainId: string;
        runId: string;
    }, artifact: StructuredArtifact): Promise<void>;
    /**
     * Returns all stored artifacts for the given run context.
     */
    static getArtifacts(context: {
        tenantId?: string;
        workspaceId?: string;
        projectId: string;
        environmentId?: string;
        chainId: string;
        runId: string;
    }): Promise<StructuredArtifact[]>;
    /**
     * Publishes a fact to the shared blackboard at a specific level.
     */
    static publishFact(context: {
        tenantId?: string;
        workspaceId?: string;
        projectId: string;
        environmentId?: string;
        chainId: string;
        runId: string;
    }, key: string, value: any, level?: 'run' | 'chain' | 'project'): Promise<void>;
    /**
     * Logs a decision to the blackboard.
     */
    static logDecision(context: {
        tenantId?: string;
        workspaceId?: string;
        projectId: string;
        environmentId?: string;
        chainId: string;
        runId: string;
    }, nodeName: string, decision: any): Promise<void>;
    /**
     * Sets the handoff context.
     */
    static setHandoffContext(context: {
        tenantId?: string;
        workspaceId?: string;
        projectId: string;
        environmentId?: string;
        chainId: string;
        runId: string;
    }, handoff: {
        fromRole: string;
        toRole: string;
        summary: string;
        rationale: string;
    }): Promise<void>;
}
