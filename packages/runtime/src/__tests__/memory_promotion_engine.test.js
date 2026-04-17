"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const memory_1 = require("@system/memory");
const memory_2 = require("@system/memory");
const memory_3 = require("@system/memory");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
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
describe('MemoryPromotionEngine', () => {
    it('auto-promotes decision candidates to shared memory', async () => {
        const memory = new memory_2.UnifiedMemoryAccessLayer(new memory_2.SharedMemoryStorageEngine({ workspaceId: 'ws-p' }, new InMemoryStore(), mockEmbeddingProvider()));
        const engine = new memory_1.MemoryPromotionEngine(memory);
        const promoted = await engine.autoPromote({
            id: 'src-1',
            type: 'decision',
            content: 'Use workspace-scoped shared memory',
            metadata: { author: 'pm', timestamp: 1, workspace_id: 'ws-p' },
        });
        expect(promoted).not.toBeNull();
        const snapshot = await memory.getGraphSnapshot();
        expect(snapshot.entities).toHaveLength(1);
        expect(snapshot.entities[0].metadata.memory_scope).toBe('shared');
    });
    it('deduplicates repeated promotions and keeps audit trail', async () => {
        const memory = new memory_2.UnifiedMemoryAccessLayer(new memory_2.SharedMemoryStorageEngine({ workspaceId: 'ws-p' }, new InMemoryStore(), mockEmbeddingProvider()));
        const engine = new memory_1.MemoryPromotionEngine(memory);
        const first = await engine.manualPromote({
            id: 'src-a',
            type: 'artifact',
            content: 'Promotion dedup artifact',
            metadata: { author: 'dev', timestamp: 1, workspace_id: 'ws-p' },
        });
        const second = await engine.manualPromote({
            id: 'src-b',
            type: 'artifact',
            content: 'Promotion dedup artifact',
            metadata: { author: 'dev', timestamp: 2, workspace_id: 'ws-p' },
        });
        expect(first.deduplicated).toBe(false);
        expect(second.deduplicated).toBe(true);
        const snapshot = await memory.getGraphSnapshot();
        expect(snapshot.entities).toHaveLength(1);
        expect(engine.getAuditTrail()).toHaveLength(2);
    });
    it('loads declarative promotion rules and thresholds from yaml', () => {
        const tmp = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'promotion-rules-'));
        const cfgPath = path_1.default.join(tmp, 'docs/runtime/memory/promotion-rules.yaml');
        fs_1.default.mkdirSync(path_1.default.dirname(cfgPath), { recursive: true });
        fs_1.default.writeFileSync(cfgPath, [
            'autoPromote:',
            '  decision: false',
            '  reusable_pattern: true',
            '  critical_insight: true',
            'thresholds:',
            '  minContentLength: 40',
        ].join('\n'), 'utf-8');
        const cfg = (0, memory_3.resolvePromotionRulesConfig)(tmp);
        expect(cfg.autoPromote.decision).toBe(false);
        expect(cfg.thresholds.minContentLength).toBe(40);
    });
    it('respects declarative thresholds and toggles', async () => {
        const memory = new memory_2.UnifiedMemoryAccessLayer(new memory_2.SharedMemoryStorageEngine({ workspaceId: 'ws-cfg' }, new InMemoryStore(), mockEmbeddingProvider()));
        const engine = new memory_1.MemoryPromotionEngine(memory, {
            autoPromote: {
                decision: false,
                reusable_pattern: true,
                critical_insight: true,
            },
            thresholds: {
                minContentLength: 100,
            },
        });
        const blocked = await engine.autoPromote({
            id: 'short-decision',
            type: 'decision',
            content: 'short decision',
            metadata: { author: 'pm', timestamp: 1, workspace_id: 'ws-cfg' },
        });
        expect(blocked).toBeNull();
    });
});
