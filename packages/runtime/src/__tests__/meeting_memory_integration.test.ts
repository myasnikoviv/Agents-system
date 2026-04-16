import { SharedMemoryStorageEngine } from '@system/memory';
import type { SemanticEmbeddingProvider } from '@system/memory';
import { UnifiedMemoryApiService } from '@system/memory';
import { MeetingMemoryIntegration } from '../meeting/MeetingMemoryIntegration';
import { MeetingSpec } from '../meeting/MeetingSpec';

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

function spec(): MeetingSpec {
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
    const engine = new SharedMemoryStorageEngine(
      { workspaceId: 'ws-meeting' },
      new InMemoryStore() as any,
      mockEmbeddingProvider(),
    );
    const api = new UnifiedMemoryApiService(engine);
    const integration = new MeetingMemoryIntegration(api);

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
