export type AgentRole = 'pm-orchestrator' | 'research-agent' | 'solution-architect' | 'developer' | 'qa' | 'reviewer' | 'system';
export interface MemoryScope {
    projectId?: string;
    tenantId?: string;
    workspaceId?: string;
    environmentId?: string;
}
/**
 * Phase 4 requirement: Agent Memory Separation
 */
export declare class MemoryManager {
    private static ns;
    /**
     * Short-term Memory (volatile/contextual per issue or run)
     */
    static saveShortTermState(role: AgentRole, planeIssueId: string, stateFragment: object, ttlSeconds?: number, scope?: string | MemoryScope): Promise<void>;
    static getShortTermState(role: AgentRole, planeIssueId: string, scope?: string | MemoryScope): Promise<any | null>;
    /**
     * Long-term Memory (lessons learned, architecture constraints)
     */
    static saveLongTermRecord(role: AgentRole, topic: string, record: object, scope?: string | MemoryScope): Promise<void>;
    static getLongTermRecord(role: AgentRole, topic: string, scope?: string | MemoryScope): Promise<any | null>;
    /**
     * Fetch all topics currently stored in long term memory for a role
     */
    static listLongTermTopics(role: AgentRole, scope?: string | MemoryScope): Promise<string[]>;
}
