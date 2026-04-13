import { MemoryPromotionEngine } from '../memory/MemoryPromotionEngine';
import { SharedMemoryStorageEngine, UnifiedMemoryAccessLayer } from '../memory/SharedMemoryStorageEngine';
import { resolvePromotionRulesConfig } from '../memory/PromotionRulesConfig';
import type { SemanticEmbeddingProvider } from '../memory/SemanticEmbeddingProvider';
import fs from 'fs';
import os from 'os';
import path from 'path';

class InMemoryStore {
  private readonly buckets = new Map<string, Map<string, string>>();
  private bucket(key: string): Map<string, string> {
    const existing = this.buckets.get(key);
    if (existing) return existing;
    const next = new Map<string, string>();
    this.buckets.set(key, next);
    return next;
  }
  async hset(key: string, field: string, value: string): Promise<number> {
    this.bucket(key).set(field, value);
    return 1;
  }
  async hget(key: string, field: string): Promise<string | null> {
    return this.bucket(key).get(field) ?? null;
  }
  async hgetall(key: string): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const [k, v] of this.bucket(key).entries()) out[k] = v;
    return out;
  }
}

function mockEmbeddingProvider(): SemanticEmbeddingProvider {
  return {
    providerId: 'test-mock',
    async embed(text: string): Promise<number[]> {
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
    const memory = new UnifiedMemoryAccessLayer(
      new SharedMemoryStorageEngine({ workspaceId: 'ws-p' }, new InMemoryStore() as any, mockEmbeddingProvider()),
    );
    const engine = new MemoryPromotionEngine(memory);

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
    const memory = new UnifiedMemoryAccessLayer(
      new SharedMemoryStorageEngine({ workspaceId: 'ws-p' }, new InMemoryStore() as any, mockEmbeddingProvider()),
    );
    const engine = new MemoryPromotionEngine(memory);

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
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'promotion-rules-'));
    const cfgPath = path.join(tmp, 'docs/runtime/memory/promotion-rules.yaml');
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(
      cfgPath,
      [
        'autoPromote:',
        '  decision: false',
        '  reusable_pattern: true',
        '  critical_insight: true',
        'thresholds:',
        '  minContentLength: 40',
      ].join('\n'),
      'utf-8',
    );

    const cfg = resolvePromotionRulesConfig(tmp);
    expect(cfg.autoPromote.decision).toBe(false);
    expect(cfg.thresholds.minContentLength).toBe(40);
  });

  it('respects declarative thresholds and toggles', async () => {
    const memory = new UnifiedMemoryAccessLayer(
      new SharedMemoryStorageEngine({ workspaceId: 'ws-cfg' }, new InMemoryStore() as any, mockEmbeddingProvider()),
    );
    const engine = new MemoryPromotionEngine(memory, {
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
