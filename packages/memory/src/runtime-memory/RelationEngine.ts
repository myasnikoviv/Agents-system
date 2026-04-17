import { SharedMemoryEntity, SharedMemoryRelation, SharedMemoryRelationType } from './SharedMemoryGraphModel';

export interface InferredRelation extends SharedMemoryRelation {
  inferred: true;
  confidence: number;
}

export interface RelationConflict {
  relationA: SharedMemoryRelation;
  relationB: SharedMemoryRelation;
  reason: 'contradiction';
}

function pairKey(from: string, to: string): string {
  return `${from}::${to}`;
}

export class RelationEngine {
  createExplicitRelation(input: SharedMemoryRelation): SharedMemoryRelation {
    return input;
  }

  inferRelations(entities: SharedMemoryEntity[], workspaceId: string): InferredRelation[] {
    const out: InferredRelation[] = [];
    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        const a = entities[i];
        const b = entities[j];
        const aTags = new Set((a.metadata.tags as string[] | undefined) || []);
        const bTags = new Set((b.metadata.tags as string[] | undefined) || []);
        const overlap = [...aTags].filter((tag) => bTags.has(tag));
        if (overlap.length === 0) continue;
        const confidence = Number(Math.min(0.95, 0.5 + overlap.length * 0.15).toFixed(2));
        out.push({
          id: `inferred:${a.id}->${b.id}:${overlap.join('-')}`,
          from: a.id,
          to: b.id,
          type: 'relates_to',
          workspace_id: workspaceId,
          metadata: { overlap_tags: overlap },
          inferred: true,
          confidence,
        });
      }
    }
    return out;
  }

  detectConflicts(relations: SharedMemoryRelation[]): RelationConflict[] {
    const out: RelationConflict[] = [];
    const map = new Map<string, SharedMemoryRelation[]>();
    for (const relation of relations) {
      const key = pairKey(relation.from, relation.to);
      const list = map.get(key) || [];
      list.push(relation);
      map.set(key, list);
    }
    for (const list of map.values()) {
      const hasDependsOn = list.find((r) => r.type === 'depends_on');
      const hasContradicts = list.find((r) => r.type === 'contradicts');
      if (hasDependsOn && hasContradicts) {
        out.push({
          relationA: hasDependsOn,
          relationB: hasContradicts,
          reason: 'contradiction',
        });
      }
    }
    return out;
  }
}

