"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memory_1 = require("@system/memory");
const memory_2 = require("@system/memory");
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
describe('UnifiedMemoryApiService', () => {
    it('exposes single-entrypoint memory API contract', async () => {
        const engine = new memory_2.SharedMemoryStorageEngine({ workspaceId: 'ws-api' }, new InMemoryStore(), mockEmbeddingProvider());
        const api = new memory_1.UnifiedMemoryApiService(engine);
        const promotion = await api.promoteMemory({
            id: 'src-1',
            type: 'decision',
            content: 'Adopt unified memory API for agents',
            metadata: { author: 'pm', timestamp: 1, workspace_id: 'ws-api', tags: ['critical'] },
        }, true, 'pm');
        expect(promotion).not.toBeNull();
        const graph = await api.queryGraph();
        expect(graph.entities.length).toBe(1);
        const links = await api.linkMemory({
            sourceEntityId: graph.entities[0].id,
            targetEntityId: graph.entities[0].id,
            sourceScope: 'shared',
            targetScope: 'shared',
        });
        expect(links.forward.id).toContain('link:');
        const relevant = await api.getRelevantMemory({
            query: 'unified memory api',
            limit: 5,
            scopes: ['shared'],
        });
        expect(relevant.length).toBeGreaterThanOrEqual(1);
    });
});
