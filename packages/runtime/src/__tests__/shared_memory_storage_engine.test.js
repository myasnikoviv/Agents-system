"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const memory_1 = require("@system/memory");
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
        const rows = {};
        for (const [field, value] of this.bucket(key).entries()) {
            rows[field] = value;
        }
        return rows;
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
describe('SharedMemoryStorageEngine', () => {
    it('stores graph and vectors via unified access layer', async () => {
        const store = new InMemoryStore();
        const engine = new memory_1.SharedMemoryStorageEngine({ tenantId: 't1', workspaceId: 'ws-1', projectId: 'p1' }, store, mockEmbeddingProvider());
        const api = new memory_1.UnifiedMemoryAccessLayer(engine);
        await api.saveGraphEntity({
            id: 'e1',
            type: 'decision',
            content: 'Use declarative loops',
            metadata: { author: 'pm', timestamp: 1, workspace_id: 'ws-1' },
            version: 1,
        });
        await api.saveGraphRelation({
            id: 'r1',
            from: 'e1',
            to: 'e1',
            type: 'relates_to',
            workspace_id: 'ws-1',
        });
        await api.saveEmbedding('e1', 'Use declarative loops');
        const snapshot = await api.getGraphSnapshot();
        const vector = await engine.getVector('e1');
        expect(snapshot.workspaceId).toBe('ws-1');
        expect(snapshot.entities).toHaveLength(1);
        expect(snapshot.relations).toHaveLength(1);
        expect(vector).not.toBeNull();
        expect(vector?.vector.length).toBe(16);
    });
    it('rejects cross-workspace writes', async () => {
        const store = new InMemoryStore();
        const engine = new memory_1.SharedMemoryStorageEngine({ workspaceId: 'ws-A' }, store, mockEmbeddingProvider());
        await expect(engine.saveEntity({
            id: 'e-cross',
            type: 'idea',
            content: 'leak',
            metadata: { author: 'x', timestamp: 1, workspace_id: 'ws-B' },
            version: 1,
        })).rejects.toThrow(/workspace mismatch/i);
    });
    it('computes cosine similarity deterministically', () => {
        const a = memory_1.__internal.cosineSimilarity([1, 0, 0], [1, 0, 0]);
        const b = memory_1.__internal.cosineSimilarity([1, 0, 0], [0, 1, 0]);
        expect(a).toBeGreaterThan(b);
    });
    it('retrieves relevant memory deterministically with scope filters', async () => {
        const store = new InMemoryStore();
        const engine = new memory_1.SharedMemoryStorageEngine({ workspaceId: 'ws-r' }, store, mockEmbeddingProvider());
        const api = new memory_1.UnifiedMemoryAccessLayer(engine);
        await api.saveGraphEntity({
            id: 'task-1',
            type: 'task',
            content: 'Fix API timeout handling',
            metadata: { author: 'dev', timestamp: 1, workspace_id: 'ws-r', memory_scope: 'task' },
            version: 1,
        });
        await api.saveGraphEntity({
            id: 'shared-1',
            type: 'decision',
            content: 'Use declarative meeting loops',
            metadata: { author: 'pm', timestamp: 2, workspace_id: 'ws-r', memory_scope: 'shared' },
            version: 1,
        });
        const allHits = await api.getRelevantMemory({
            query: 'meeting loops and decisions',
            limit: 5,
        });
        expect(allHits.length).toBeGreaterThanOrEqual(1);
        expect(allHits[0].score).toBeGreaterThanOrEqual(allHits[allHits.length - 1].score);
        const taskOnlyHits = await api.getRelevantMemory({
            query: 'meeting loops and decisions',
            scopes: ['task'],
            limit: 5,
        });
        expect(taskOnlyHits.every((hit) => hit.entity.metadata.memory_scope === 'task')).toBe(true);
    });
    it('supports hybrid retrieval with graph-neighbor expansion and explainable reasons', async () => {
        const store = new InMemoryStore();
        const engine = new memory_1.SharedMemoryStorageEngine({ workspaceId: 'ws-h' }, store, mockEmbeddingProvider());
        const api = new memory_1.UnifiedMemoryAccessLayer(engine);
        await api.saveGraphEntity({
            id: 'e-semantic',
            type: 'decision',
            content: 'Adopt hybrid retrieval strategy',
            metadata: { author: 'arch', timestamp: 1, workspace_id: 'ws-h', memory_scope: 'shared' },
            version: 1,
        });
        await api.saveGraphEntity({
            id: 'e-neighbor',
            type: 'artifact',
            content: 'Related architecture note',
            metadata: { author: 'arch', timestamp: 2, workspace_id: 'ws-h', memory_scope: 'shared' },
            version: 1,
        });
        await api.saveGraphRelation({
            id: 'rel-1',
            from: 'e-semantic',
            to: 'e-neighbor',
            type: 'relates_to',
            workspace_id: 'ws-h',
        });
        const hits = await api.getHybridRelevantMemory({
            query: 'hybrid retrieval strategy',
            limit: 10,
            strategy: 'hybrid',
            includeNeighbors: true,
            neighborDepth: 1,
        });
        const semantic = hits.find((h) => h.entity.id === 'e-semantic');
        const neighbor = hits.find((h) => h.entity.id === 'e-neighbor');
        expect(semantic).toBeDefined();
        expect(neighbor).toBeDefined();
        expect(semantic?.reasons).toContain('semantic_similarity');
        expect(neighbor?.reasons.some((r) => r.startsWith('graph_neighbor_depth_'))).toBe(true);
    });
    it('creates bidirectional cross-scope links between shared and task/project/agent memory', async () => {
        const store = new InMemoryStore();
        const engine = new memory_1.SharedMemoryStorageEngine({ workspaceId: 'ws-link' }, store, mockEmbeddingProvider());
        const api = new memory_1.UnifiedMemoryAccessLayer(engine);
        await api.saveGraphEntity({
            id: 'task-node',
            type: 'task',
            content: 'task memory',
            metadata: { author: 'dev', timestamp: 1, workspace_id: 'ws-link', memory_scope: 'task' },
            version: 1,
        });
        await api.saveGraphEntity({
            id: 'shared-node',
            type: 'decision',
            content: 'shared memory',
            metadata: { author: 'pm', timestamp: 2, workspace_id: 'ws-link', memory_scope: 'shared' },
            version: 1,
        });
        const links = await api.createBidirectionalCrossScopeLink({
            sourceEntityId: 'task-node',
            targetEntityId: 'shared-node',
            sourceScope: 'task',
            targetScope: 'shared',
        });
        const snapshot = await api.getGraphSnapshot();
        expect(snapshot.relations).toHaveLength(2);
        expect(links.forward.metadata?.cross_scope).toBe(true);
        expect(links.backward.metadata?.cross_scope).toBe(true);
        expect(links.forward.from).toBe('task-node');
        expect(links.backward.from).toBe('shared-node');
    });
    it('supports explicit + inferred relations and conflict detection through unified API', async () => {
        const store = new InMemoryStore();
        const engine = new memory_1.SharedMemoryStorageEngine({ workspaceId: 'ws-rel' }, store, mockEmbeddingProvider());
        const api = new memory_1.UnifiedMemoryAccessLayer(engine);
        await api.saveGraphEntity({
            id: 'x',
            type: 'idea',
            content: 'X',
            metadata: { author: 'a', timestamp: 1, workspace_id: 'ws-rel', tags: ['k1'] },
            version: 1,
        });
        await api.saveGraphEntity({
            id: 'y',
            type: 'task',
            content: 'Y',
            metadata: { author: 'a', timestamp: 1, workspace_id: 'ws-rel', tags: ['k1'] },
            version: 1,
        });
        await api.addExplicitRelation({
            id: 'exp-1',
            from: 'x',
            to: 'y',
            type: 'depends_on',
            workspace_id: 'ws-rel',
        });
        await api.addExplicitRelation({
            id: 'exp-2',
            from: 'x',
            to: 'y',
            type: 'contradicts',
            workspace_id: 'ws-rel',
        });
        const inferred = await api.inferAndPersistRelations();
        const conflicts = await api.detectRelationConflicts();
        expect(inferred.length).toBeGreaterThanOrEqual(1);
        expect(conflicts.length).toBe(1);
        expect(conflicts[0].reason).toBe('contradiction');
    });
});
