"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memory_1 = require("@system/memory");
const memory_2 = require("@system/memory");
const MeetingMemoryIntegration_1 = require("../meeting/MeetingMemoryIntegration");
class InMemoryStore {
    buckets = new Map();
    bucket(key) {
        const existing = this.buckets.get(key);
        if (existing)
            return existing;
        const next = new Map();
        this.buckets.set(key, next);
        return next;
    }
    async hset(key, field, value) {
        this.bucket(key).set(field, value);
        return 1;
    }
    async hget(key, field) {
        return this.bucket(key).get(field) ?? null;
    }
    async hgetall(key) {
        const out = {};
        for (const [k, v] of this.bucket(key).entries())
            out[k] = v;
        return out;
    }
}
function mockEmbeddingProvider() {
    return {
        providerId: 'test-mock',
        async embed(text) {
            const src = String(text || '');
            const out = new Array(16).fill(0);
            for (let i = 0; i < src.length; i += 1) {
                out[i % 16] += src.charCodeAt(i) / 255;
            }
            return out;
        },
    };
}
function spec() {
    return {
        pipeline: 'meeting',
        mode: 'debate',
        participants: ['architect', 'reviewer'],
        moderator: 'architect',
        rounds: 1,
        turn_strategy: 'round_robin',
        rules: ['each_agent_must_provide_argument', 'moderator_must_finalize_decision'],
        artifacts: ['decision'],
    };
}
describe('MeetingMemoryIntegration', () => {
    it('persists decisions, discussion nodes, and relations into shared memory', async () => {
        const engine = new memory_1.SharedMemoryStorageEngine({ workspaceId: 'ws-meeting' }, new InMemoryStore(), mockEmbeddingProvider());
        const api = new memory_2.UnifiedMemoryApiService(engine);
        const integration = new MeetingMemoryIntegration_1.MeetingMemoryIntegration(api);
        const result = await integration.persistMeetingOutputs({
            spec: spec(),
            workspaceId: 'ws-meeting',
            roundState: {
                currentRound: 1,
                completedTurns: 2,
                byRound: {
                    1: [
                        { participant: 'architect', payload: 'Architecture proposal' },
                        { participant: 'reviewer', payload: 'Risk feedback' },
                    ],
                },
                completed: true,
            },
            artifacts: [{ name: 'decision', payload: { summary: 'Choose option A' } }],
        });
        const graph = await api.queryGraph();
        expect(result.decisionEntityId).toBeTruthy();
        expect(result.discussionEntityIds.length).toBe(2);
        expect(result.relationIds.length).toBeGreaterThanOrEqual(2);
        expect(graph.entities.length).toBeGreaterThanOrEqual(3);
        expect(graph.relations.length).toBeGreaterThanOrEqual(2);
    });
});
