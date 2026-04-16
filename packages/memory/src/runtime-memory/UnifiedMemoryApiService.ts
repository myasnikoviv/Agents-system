import { MemoryPromotionEngine, PromotionCandidate, PromotionRecord } from './MemoryPromotionEngine';
import {
  CrossScopeLinkInput,
  HybridRetrievalHit,
  HybridRetrievalQuery,
  RelevanceHit,
  RelevanceQuery,
  SharedMemoryStorageEngine,
  UnifiedMemoryAccessLayer,
} from './SharedMemoryStorageEngine';
import { SharedMemoryGraphSnapshot } from './SharedMemoryGraphModel';

export class UnifiedMemoryApiService {
  private readonly access: UnifiedMemoryAccessLayer;
  private readonly promotion: MemoryPromotionEngine;

  constructor(engine: SharedMemoryStorageEngine) {
    this.access = new UnifiedMemoryAccessLayer(engine);
    this.promotion = new MemoryPromotionEngine(this.access);
  }

  async getRelevantMemory(query: RelevanceQuery): Promise<RelevanceHit[]> {
    return this.access.getRelevantMemory(query);
  }

  async getHybridRelevantMemory(query: HybridRetrievalQuery): Promise<HybridRetrievalHit[]> {
    return this.access.getHybridRelevantMemory(query);
  }

  async promoteMemory(candidate: PromotionCandidate, manual = false, actor = 'system'): Promise<PromotionRecord | null> {
    if (manual) {
      return this.promotion.manualPromote(candidate, actor);
    }
    return this.promotion.autoPromote(candidate, actor);
  }

  async linkMemory(input: CrossScopeLinkInput) {
    return this.access.createBidirectionalCrossScopeLink(input);
  }

  async queryGraph(): Promise<SharedMemoryGraphSnapshot> {
    return this.access.getGraphSnapshot();
  }

  getPromotionAuditTrail(): PromotionRecord[] {
    return this.promotion.getAuditTrail();
  }
}

