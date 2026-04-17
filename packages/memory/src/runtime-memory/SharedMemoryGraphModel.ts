export type SharedMemoryEntityType = 'idea' | 'decision' | 'artifact' | 'task' | 'message';
export type SharedMemoryRelationType = 'depends_on' | 'relates_to' | 'contradicts' | 'refines';

export interface SharedMemoryEntityMetadata {
  author: string;
  timestamp: number;
  workspace_id: string;
  [key: string]: unknown;
}

export interface SharedMemoryEntity {
  id: string;
  type: SharedMemoryEntityType;
  content: string;
  metadata: SharedMemoryEntityMetadata;
  version: number;
  previousVersionId?: string;
}

export interface SharedMemoryRelation {
  id: string;
  from: string;
  to: string;
  type: SharedMemoryRelationType;
  workspace_id: string;
  metadata?: Record<string, unknown>;
}

export interface SharedMemoryGraphSnapshot {
  workspaceId: string;
  entities: SharedMemoryEntity[];
  relations: SharedMemoryRelation[];
}

function normalizeWorkspaceId(workspaceId: string): string {
  const normalized = String(workspaceId || '').trim();
  if (!normalized) {
    throw new Error('workspaceId is required');
  }
  return normalized;
}

function assertEntityWorkspace(entity: SharedMemoryEntity, workspaceId: string): void {
  if (entity.metadata.workspace_id !== workspaceId) {
    throw new Error(`Entity ${entity.id} workspace mismatch`);
  }
}

export class SharedMemoryGraphModel {
  private readonly workspaceId: string;
  private readonly entities = new Map<string, SharedMemoryEntity>();
  private readonly relations = new Map<string, SharedMemoryRelation>();

  constructor(workspaceId: string) {
    this.workspaceId = normalizeWorkspaceId(workspaceId);
  }

  getWorkspaceId(): string {
    return this.workspaceId;
  }

  addEntity(entity: Omit<SharedMemoryEntity, 'version'> & { version?: number }): SharedMemoryEntity {
    if (this.entities.has(entity.id)) {
      throw new Error(`Entity ${entity.id} already exists`);
    }

    const next: SharedMemoryEntity = {
      ...entity,
      version: entity.version ?? 1,
    };
    assertEntityWorkspace(next, this.workspaceId);
    this.entities.set(next.id, next);
    return next;
  }

  updateEntityVersion(
    entityId: string,
    patch: Partial<Pick<SharedMemoryEntity, 'type' | 'content' | 'metadata'>>,
  ): SharedMemoryEntity {
    const current = this.entities.get(entityId);
    if (!current) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const updated: SharedMemoryEntity = {
      ...current,
      ...patch,
      metadata: {
        ...current.metadata,
        ...(patch.metadata || {}),
      },
      version: current.version + 1,
      previousVersionId: current.id,
    };
    assertEntityWorkspace(updated, this.workspaceId);
    this.entities.set(entityId, updated);
    return updated;
  }

  addRelation(relation: SharedMemoryRelation): SharedMemoryRelation {
    if (this.relations.has(relation.id)) {
      throw new Error(`Relation ${relation.id} already exists`);
    }
    if (relation.workspace_id !== this.workspaceId) {
      throw new Error(`Relation ${relation.id} workspace mismatch`);
    }
    if (!this.entities.has(relation.from)) {
      throw new Error(`Relation source entity ${relation.from} not found`);
    }
    if (!this.entities.has(relation.to)) {
      throw new Error(`Relation target entity ${relation.to} not found`);
    }
    this.relations.set(relation.id, relation);
    return relation;
  }

  getEntity(id: string): SharedMemoryEntity | null {
    return this.entities.get(id) || null;
  }

  getRelation(id: string): SharedMemoryRelation | null {
    return this.relations.get(id) || null;
  }

  snapshot(): SharedMemoryGraphSnapshot {
    return {
      workspaceId: this.workspaceId,
      entities: [...this.entities.values()],
      relations: [...this.relations.values()],
    };
  }
}
