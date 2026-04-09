import { getRedisClient } from './redisClient';

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
export class MemoryManager {
    private static ns(role: AgentRole, scope?: MemoryScope): string {
        const projectId = String(scope?.projectId || 'default').trim() || 'default';
        const tenantId = String(scope?.tenantId || process.env.DEFAULT_TENANT_ID || `tenant:${projectId}`).trim();
        const workspaceId = String(scope?.workspaceId || process.env.DEFAULT_WORKSPACE_ID || `workspace:${projectId}`).trim();
        const environmentId = String(scope?.environmentId || `env:${tenantId}:${workspaceId}:project:${projectId}`).trim();
        return `memory:${tenantId}:${workspaceId}:${projectId}:${environmentId}:${role}`;
    }

    /**
     * Short-term Memory (volatile/contextual per issue or run)
     */
    static async saveShortTermState(
        role: AgentRole,
        planeIssueId: string,
        stateFragment: object,
        ttlSeconds: number = 86400,
        scope: string | MemoryScope = 'default',
    ): Promise<void> {
        const redis = getRedisClient();
        const normalizedScope = typeof scope === 'string' ? { projectId: scope } : scope;
        const key = `${this.ns(role, normalizedScope)}:current_task:${planeIssueId}`;
        await redis.set(key, JSON.stringify(stateFragment), 'EX', ttlSeconds);
    }

    static async getShortTermState(role: AgentRole, planeIssueId: string, scope: string | MemoryScope = 'default'): Promise<any | null> {
        const redis = getRedisClient();
        const normalizedScope = typeof scope === 'string' ? { projectId: scope } : scope;
        const key = `${this.ns(role, normalizedScope)}:current_task:${planeIssueId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Long-term Memory (lessons learned, architecture constraints)
     */
    static async saveLongTermRecord(role: AgentRole, topic: string, record: object, scope: string | MemoryScope = 'default'): Promise<void> {
        const redis = getRedisClient();
        const normalizedScope = typeof scope === 'string' ? { projectId: scope } : scope;
        const key = `${this.ns(role, normalizedScope)}:lessons_learned:${topic}`;
        // Can be managed via hashes or simple strings. Strings chosen for MVP simplicity.
        await redis.set(key, JSON.stringify(record));
    }

    static async getLongTermRecord(role: AgentRole, topic: string, scope: string | MemoryScope = 'default'): Promise<any | null> {
        const redis = getRedisClient();
        const normalizedScope = typeof scope === 'string' ? { projectId: scope } : scope;
        const key = `${this.ns(role, normalizedScope)}:lessons_learned:${topic}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Fetch all topics currently stored in long term memory for a role
     */
    static async listLongTermTopics(role: AgentRole, scope: string | MemoryScope = 'default'): Promise<string[]> {
        const redis = getRedisClient();
        const normalizedScope = typeof scope === 'string' ? { projectId: scope } : scope;
        const pattern = `${this.ns(role, normalizedScope)}:lessons_learned:*`;
        const keys = await redis.keys(pattern);
        return keys.map(k => k.split(':').pop() || '');
    }
}
