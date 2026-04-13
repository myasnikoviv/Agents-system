import { RunContext } from '../context/RunContext';
import { SharedMemoryStorageEngine } from './SharedMemoryStorageEngine';
import { UnifiedMemoryApiService } from './UnifiedMemoryApiService';

export interface ContextInjectionPolicy {
  maxItems: number;
  maxTotalChars: number;
  maxItemChars: number;
}

const DEFAULT_POLICY: ContextInjectionPolicy = {
  maxItems: 5,
  maxTotalChars: 2400,
  maxItemChars: 500,
};

function truncate(text: string, maxChars: number): string {
  const value = String(text || '');
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

export async function injectRelevantMemoryIntoContext(
  context: RunContext,
  query: string,
  policy: Partial<ContextInjectionPolicy> = {},
): Promise<void> {
  const q = String(query || '').trim();
  if (!q) return;
  if (!context.workspaceId) return;
  const resolvedPolicy: ContextInjectionPolicy = {
    ...DEFAULT_POLICY,
    ...policy,
  };

  const engine = SharedMemoryStorageEngine.createDefault({
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
  });
  const api = new UnifiedMemoryApiService(engine);

  const relevant = await api.getRelevantMemory({
    query: q,
    limit: Math.max(1, Number(resolvedPolicy.maxItems || DEFAULT_POLICY.maxItems)),
  });
  const prioritized = [...relevant].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entity.id.localeCompare(b.entity.id);
  });

  if (!context.memory.sharedFacts) {
    context.memory.sharedFacts = {};
  }
  const selected: Array<{ id: string; type: string; score: number; content: string }> = [];
  let consumedChars = 0;
  for (const hit of prioritized) {
    const itemContent = truncate(hit.entity.content, resolvedPolicy.maxItemChars);
    if (consumedChars + itemContent.length > resolvedPolicy.maxTotalChars) {
      continue;
    }
    selected.push({
      id: hit.entity.id,
      type: hit.entity.type,
      score: hit.score,
      content: itemContent,
    });
    consumedChars += itemContent.length;
    if (selected.length >= resolvedPolicy.maxItems) break;
  }
  context.memory.sharedFacts.__relevant_memory = selected;
  context.memory.sharedFacts.__relevant_memory_meta = {
    injected_at: Date.now(),
    total_items: selected.length,
    total_chars: consumedChars,
    policy: resolvedPolicy,
  };
}
