import { getRedisClient } from './redisClient';

export type AgentRole = 'pm-orchestrator' | 'research-agent' | 'solution-architect' | 'developer' | 'qa' | 'reviewer' | 'system';

/**
 * Phase 4 requirement: Agent Memory Separation
 */
export class MemoryManager {
    /**
     * Short-term Memory (volatile/contextual per issue or run)
     */
    static async saveShortTermState(role: AgentRole, planeIssueId: string, stateFragment: object, ttlSeconds: number = 86400): Promise<void> {
        const redis = getRedisClient();
        const key = `memory:${role}:current_task:${planeIssueId}`;
        await redis.set(key, JSON.stringify(stateFragment), 'EX', ttlSeconds);
    }

    static async getShortTermState(role: AgentRole, planeIssueId: string): Promise<any | null> {
        const redis = getRedisClient();
        const key = `memory:${role}:current_task:${planeIssueId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Long-term Memory (lessons learned, architecture constraints)
     */
    static async saveLongTermRecord(role: AgentRole, topic: string, record: object): Promise<void> {
        const redis = getRedisClient();
        const key = `memory:${role}:lessons_learned:${topic}`;
        // Can be managed via hashes or simple strings. Strings chosen for MVP simplicity.
        await redis.set(key, JSON.stringify(record));
    }

    static async getLongTermRecord(role: AgentRole, topic: string): Promise<any | null> {
        const redis = getRedisClient();
        const key = `memory:${role}:lessons_learned:${topic}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Fetch all topics currently stored in long term memory for a role
     */
    static async listLongTermTopics(role: AgentRole): Promise<string[]> {
        const redis = getRedisClient();
        const pattern = `memory:${role}:lessons_learned:*`;
        const keys = await redis.keys(pattern);
        return keys.map(k => k.split(':').pop() || '');
    }
}
