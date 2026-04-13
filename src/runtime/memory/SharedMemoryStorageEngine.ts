import { getRedisClient } from '../redisClient';
import {
  SharedMemoryEntity,
  SharedMemoryGraphSnapshot,
  SharedMemoryRelation,
} from './SharedMemoryGraphModel';
import { RelationEngine, RelationConflict, InferredRelation } from './RelationEngine';
import { resolveSemanticEmbeddingProvider, SemanticEmbeddingProvider } from './SemanticEmbeddingProvider';

interface MemoryStoreAdapter {
  hset(key: string, field: string, value: string): Promise<unknown>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
}

class RedisMemoryStoreAdapter implements MemoryStoreAdapter {
  async hset(key: string, field: string, value: string): Promise<unknown> {
    const redis = getRedisClient();
    return redis.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const redis = getRedisClient();
    return redis.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const redis = getRedisClient();
    return redis.hgetall(key);
  }
}

export interface SharedMemoryVectorRecord {
  entityId: string;
  workspaceId: string;
  vector: number[];
  createdAt: number;
}

interface StorageNamespace {
  tenantId: string;
  workspaceId: string;
  projectId: string;
}

function normalizeNamespace(input: Partial<StorageNamespace> & { workspaceId: string }): StorageNamespace {
  const workspaceId = String(input.workspaceId || '').trim();
  if (!workspaceId) {
    throw new Error('workspaceId is required');
  }
  const projectId = String(input.projectId || 'default').trim() || 'default';
  const tenantId = String(input.tenantId || process.env.DEFAULT_TENANT_ID || `tenant:${projectId}`).trim();
  return { tenantId, workspaceId, projectId };
}

function baseKey(ns: StorageNamespace): string {
  return `agsys:memory:${ns.tenantId}:${ns.workspaceId}:${ns.projectId}:shared`;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RelevanceQuery {
  query: string;
  limit?: number;
  minScore?: number;
  scopes?: string[];
}

export interface RelevanceHit {
  entity: SharedMemoryEntity;
  score: number;
}

export interface HybridRetrievalQuery extends RelevanceQuery {
  includeNeighbors?: boolean;
  neighborDepth?: number;
  strategy?: 'semantic_only' | 'hybrid';
}

export interface HybridRetrievalHit extends RelevanceHit {
  reasons: string[];
}

export interface CrossScopeLinkInput {
  sourceEntityId: string;
  targetEntityId: string;
  relationType?: SharedMemoryRelation['type'];
  sourceScope: 'task' | 'project' | 'agent' | 'shared';
  targetScope: 'task' | 'project' | 'agent' | 'shared';
}

export class SharedMemoryStorageEngine {
  private readonly ns: StorageNamespace;
  private readonly store: MemoryStoreAdapter;
  private readonly embeddingProvider: SemanticEmbeddingProvider;

  constructor(
    scope: Partial<StorageNamespace> & { workspaceId: string },
    store: MemoryStoreAdapter = new RedisMemoryStoreAdapter(),
    embeddingProvider: SemanticEmbeddingProvider = resolveSemanticEmbeddingProvider(),
  ) {
    this.ns = normalizeNamespace(scope);
    this.store = store;
    this.embeddingProvider = embeddingProvider;
  }

  static createDefault(scope: Partial<StorageNamespace> & { workspaceId: string }): SharedMemoryStorageEngine {
    return new SharedMemoryStorageEngine(scope, new RedisMemoryStoreAdapter(), resolveSemanticEmbeddingProvider());
  }

  private entitiesKey(): string {
    return `${baseKey(this.ns)}:entities`;
  }

  private relationsKey(): string {
    return `${baseKey(this.ns)}:relations`;
  }

  private vectorsKey(): string {
    return `${baseKey(this.ns)}:vectors`;
  }

  getWorkspaceId(): string {
    return this.ns.workspaceId;
  }

  async computeEmbedding(content: string): Promise<number[]> {
    const embedded = await this.embeddingProvider.embed(content);
    return Array.isArray(embedded) ? embedded.map((v) => Number(v)) : [];
  }

  async saveEntity(entity: SharedMemoryEntity): Promise<void> {
    if (entity.metadata.workspace_id !== this.ns.workspaceId) {
      throw new Error(`Entity ${entity.id} workspace mismatch`);
    }
    await this.store.hset(this.entitiesKey(), entity.id, JSON.stringify(entity));
    const embedded = await this.computeEmbedding(entity.content);
    await this.saveVector({
      entityId: entity.id,
      workspaceId: this.ns.workspaceId,
      vector: embedded,
      createdAt: Date.now(),
    });
  }

  async getEntity(entityId: string): Promise<SharedMemoryEntity | null> {
    const raw = await this.store.hget(this.entitiesKey(), entityId);
    return raw ? (JSON.parse(raw) as SharedMemoryEntity) : null;
  }

  async saveRelation(relation: SharedMemoryRelation): Promise<void> {
    if (relation.workspace_id !== this.ns.workspaceId) {
      throw new Error(`Relation ${relation.id} workspace mismatch`);
    }
    await this.store.hset(this.relationsKey(), relation.id, JSON.stringify(relation));
  }

  async saveVector(record: SharedMemoryVectorRecord): Promise<void> {
    if (record.workspaceId !== this.ns.workspaceId) {
      throw new Error(`Vector ${record.entityId} workspace mismatch`);
    }
    await this.store.hset(this.vectorsKey(), record.entityId, JSON.stringify(record));
  }

  async getVector(entityId: string): Promise<SharedMemoryVectorRecord | null> {
    const raw = await this.store.hget(this.vectorsKey(), entityId);
    return raw ? (JSON.parse(raw) as SharedMemoryVectorRecord) : null;
  }

  async queryVectors(): Promise<SharedMemoryVectorRecord[]> {
    const rows = await this.store.hgetall(this.vectorsKey());
    return Object.values(rows).map((row) => JSON.parse(row) as SharedMemoryVectorRecord);
  }

  async queryGraph(): Promise<SharedMemoryGraphSnapshot> {
    const [entityRows, relationRows] = await Promise.all([
      this.store.hgetall(this.entitiesKey()),
      this.store.hgetall(this.relationsKey()),
    ]);
    return {
      workspaceId: this.ns.workspaceId,
      entities: Object.values(entityRows).map((row) => JSON.parse(row) as SharedMemoryEntity),
      relations: Object.values(relationRows).map((row) => JSON.parse(row) as SharedMemoryRelation),
    };
  }
}

export class UnifiedMemoryAccessLayer {
  private readonly relationEngine = new RelationEngine();

  constructor(private readonly engine: SharedMemoryStorageEngine) {}

  async saveGraphEntity(entity: SharedMemoryEntity): Promise<void> {
    await this.engine.saveEntity(entity);
  }

  async saveGraphRelation(relation: SharedMemoryRelation): Promise<void> {
    await this.engine.saveRelation(relation);
  }

  async saveEmbedding(entityId: string, content: string): Promise<void> {
    const vector = await this.engine.computeEmbedding(content);
    await this.engine.saveVector({
      entityId,
      workspaceId: this.engine.getWorkspaceId(),
      vector,
      createdAt: Date.now(),
    });
  }

  async getGraphSnapshot(): Promise<SharedMemoryGraphSnapshot> {
    return this.engine.queryGraph();
  }

  async getRelevantMemory(input: RelevanceQuery): Promise<RelevanceHit[]> {
    const queryEmbedding = await this.engine.computeEmbedding(input.query);
    const vectors = await this.engine.queryVectors();
    const entitiesById = new Map(
      (await this.engine.queryGraph()).entities.map((entity) => [entity.id, entity]),
    );
    const scopeFilter = new Set((input.scopes || []).map((s) => String(s).trim()).filter(Boolean));
    const minScore = Number(input.minScore ?? 0);
    const limit = Math.max(1, Number(input.limit ?? 10));

    const hits: RelevanceHit[] = [];
    for (const vector of vectors) {
      const entity = entitiesById.get(vector.entityId);
      if (!entity) continue;
      const entityScope = String((entity.metadata as Record<string, unknown>).memory_scope || 'shared');
      if (scopeFilter.size > 0 && !scopeFilter.has(entityScope)) {
        continue;
      }
      const score = Number(cosineSimilarity(queryEmbedding, vector.vector).toFixed(6));
      if (score < minScore) continue;
      hits.push({ entity, score });
    }

    hits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entity.id.localeCompare(b.entity.id);
    });
    return hits.slice(0, limit);
  }

  async getHybridRelevantMemory(input: HybridRetrievalQuery): Promise<HybridRetrievalHit[]> {
    const strategy = input.strategy || 'hybrid';
    const includeNeighbors = Boolean(input.includeNeighbors ?? true);
    const neighborDepth = Math.max(1, Number(input.neighborDepth ?? 1));
    const baseHits = await this.getRelevantMemory(input);
    const graph = await this.engine.queryGraph();

    if (strategy === 'semantic_only' || !includeNeighbors || baseHits.length === 0) {
      return baseHits.map((hit) => ({ ...hit, reasons: ['semantic_similarity'] }));
    }

    const entitiesById = new Map(graph.entities.map((e) => [e.id, e]));
    const adjacency = new Map<string, Set<string>>();
    for (const relation of graph.relations) {
      const from = relation.from;
      const to = relation.to;
      if (!adjacency.has(from)) adjacency.set(from, new Set());
      if (!adjacency.has(to)) adjacency.set(to, new Set());
      adjacency.get(from)!.add(to);
      adjacency.get(to)!.add(from);
    }

    const hitMap = new Map<string, HybridRetrievalHit>();
    for (const hit of baseHits) {
      hitMap.set(hit.entity.id, {
        ...hit,
        reasons: ['semantic_similarity'],
      });
    }

    for (const base of baseHits) {
      const visited = new Set<string>([base.entity.id]);
      let frontier = new Set<string>([base.entity.id]);
      for (let depth = 1; depth <= neighborDepth; depth += 1) {
        const next = new Set<string>();
        for (const node of frontier) {
          for (const neighbor of adjacency.get(node) || []) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            next.add(neighbor);
            const entity = entitiesById.get(neighbor);
            if (!entity) continue;
            const scope = String((entity.metadata as Record<string, unknown>).memory_scope || 'shared');
            if (input.scopes?.length && !input.scopes.includes(scope)) continue;

            const bonus = Number((0.15 / depth).toFixed(6));
            const existing = hitMap.get(entity.id);
            if (!existing) {
              hitMap.set(entity.id, {
                entity,
                score: bonus,
                reasons: [`graph_neighbor_depth_${depth}`],
              });
            } else {
              existing.score = Number((existing.score + bonus).toFixed(6));
              if (!existing.reasons.includes(`graph_neighbor_depth_${depth}`)) {
                existing.reasons.push(`graph_neighbor_depth_${depth}`);
              }
            }
          }
        }
        frontier = next;
        if (frontier.size === 0) break;
      }
    }

    const result = [...hitMap.values()];
    result.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entity.id.localeCompare(b.entity.id);
    });
    return result.slice(0, Math.max(1, Number(input.limit ?? 10)));
  }

  async createBidirectionalCrossScopeLink(input: CrossScopeLinkInput): Promise<{
    forward: SharedMemoryRelation;
    backward: SharedMemoryRelation;
  }> {
    const relationType = input.relationType || 'relates_to';
    const source = await this.engine.getEntity(input.sourceEntityId);
    const target = await this.engine.getEntity(input.targetEntityId);
    if (!source) {
      throw new Error(`Source entity ${input.sourceEntityId} not found`);
    }
    if (!target) {
      throw new Error(`Target entity ${input.targetEntityId} not found`);
    }

    const now = Date.now();
    const forward: SharedMemoryRelation = {
      id: `link:${input.sourceEntityId}->${input.targetEntityId}:${now}`,
      from: input.sourceEntityId,
      to: input.targetEntityId,
      type: relationType,
      workspace_id: this.engine.getWorkspaceId(),
      metadata: {
        cross_scope: true,
        from_scope: input.sourceScope,
        to_scope: input.targetScope,
        direction: 'forward',
      },
    };
    const backward: SharedMemoryRelation = {
      id: `link:${input.targetEntityId}->${input.sourceEntityId}:${now}`,
      from: input.targetEntityId,
      to: input.sourceEntityId,
      type: relationType,
      workspace_id: this.engine.getWorkspaceId(),
      metadata: {
        cross_scope: true,
        from_scope: input.targetScope,
        to_scope: input.sourceScope,
        direction: 'backward',
      },
    };

    await this.saveGraphRelation(forward);
    await this.saveGraphRelation(backward);
    return { forward, backward };
  }

  async addExplicitRelation(relation: SharedMemoryRelation): Promise<SharedMemoryRelation> {
    const explicit = this.relationEngine.createExplicitRelation(relation);
    await this.saveGraphRelation(explicit);
    return explicit;
  }

  async inferAndPersistRelations(): Promise<InferredRelation[]> {
    const graph = await this.engine.queryGraph();
    const inferred = this.relationEngine.inferRelations(graph.entities, this.engine.getWorkspaceId());
    for (const relation of inferred) {
      await this.saveGraphRelation(relation);
    }
    return inferred;
  }

  async detectRelationConflicts(): Promise<RelationConflict[]> {
    const graph = await this.engine.queryGraph();
    return this.relationEngine.detectConflicts(graph.relations);
  }
}

export const __internal = {
  cosineSimilarity,
};
