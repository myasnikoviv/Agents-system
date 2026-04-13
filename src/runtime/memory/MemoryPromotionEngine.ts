import { SharedMemoryEntity } from './SharedMemoryGraphModel';
import { UnifiedMemoryAccessLayer } from './SharedMemoryStorageEngine';
import { resolvePromotionRulesConfig, PromotionRulesConfig } from './PromotionRulesConfig';

export type PromotionReason = 'decision' | 'reusable_pattern' | 'critical_insight' | 'manual';

export interface PromotionCandidate {
  id: string;
  type: SharedMemoryEntity['type'];
  content: string;
  metadata: SharedMemoryEntity['metadata'] & {
    source_scope?: string;
    tags?: string[];
  };
}

export interface PromotionRecord {
  promotedEntityId: string;
  sourceId: string;
  reason: PromotionReason;
  at: number;
  actor: string;
  deduplicated: boolean;
}

function normalizeContent(content: string): string {
  return String(content || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function makeHash(content: string): string {
  let hash = 0;
  const src = normalizeContent(content);
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(hash)}`;
}

export class MemoryPromotionEngine {
  private readonly auditTrail: PromotionRecord[] = [];
  private readonly config: PromotionRulesConfig;

  constructor(
    private readonly memory: UnifiedMemoryAccessLayer,
    config: PromotionRulesConfig = resolvePromotionRulesConfig(),
  ) {
    this.config = config;
  }

  getAuditTrail(): PromotionRecord[] {
    return [...this.auditTrail];
  }

  private shouldAutoPromote(candidate: PromotionCandidate): PromotionReason | null {
    if (String(candidate.content || '').trim().length < this.config.thresholds.minContentLength) {
      return null;
    }

    if (candidate.type === 'decision') return 'decision';
    const tags = new Set((candidate.metadata.tags || []).map((t) => String(t).toLowerCase()));
    if (tags.has('reusable') || tags.has('pattern')) return 'reusable_pattern';
    if (tags.has('critical') || tags.has('insight')) return 'critical_insight';
    return null;
  }

  async autoPromote(candidate: PromotionCandidate, actor = 'system'): Promise<PromotionRecord | null> {
    const reason = this.shouldAutoPromote(candidate);
    if (!reason) return null;
    if (!this.config.autoPromote[reason]) return null;
    return this.promote(candidate, reason, actor);
  }

  async manualPromote(candidate: PromotionCandidate, actor = 'human'): Promise<PromotionRecord> {
    return this.promote(candidate, 'manual', actor);
  }

  async promote(
    candidate: PromotionCandidate,
    reason: PromotionReason,
    actor: string,
  ): Promise<PromotionRecord> {
    const snapshot = await this.memory.getGraphSnapshot();
    const digest = makeHash(candidate.content);
    const existing = snapshot.entities.find((entity) => {
      const d = String((entity.metadata as Record<string, unknown>).content_digest || '');
      return d === digest && normalizeContent(entity.content) === normalizeContent(candidate.content);
    });

    const promotedEntityId = existing ? existing.id : `shared-${candidate.id}-${digest}`;
    const deduplicated = Boolean(existing);

    if (!existing) {
      await this.memory.saveGraphEntity({
        id: promotedEntityId,
        type: candidate.type,
        content: candidate.content,
        version: 1,
        metadata: {
          ...candidate.metadata,
          workspace_id: candidate.metadata.workspace_id,
          promoted_from: candidate.id,
          promoted_reason: reason,
          promoted_at: Date.now(),
          content_digest: digest,
          memory_scope: 'shared',
        },
      });
    }

    const record: PromotionRecord = {
      promotedEntityId,
      sourceId: candidate.id,
      reason,
      at: Date.now(),
      actor,
      deduplicated,
    };
    this.auditTrail.push(record);
    return record;
  }
}
