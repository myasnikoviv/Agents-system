import { getRedisClient } from '../redisClient';
import { MemoryManager } from '../MemoryManager';

export interface HydratedMemory {
  history: any[];
  lastOutcome?: string;
  activeTicketId?: string;
  metadata: Record<string, any>;
}

export class MemoryHydrator {
  private static readonly CONTEXT_KEY_PREFIX = 'run_context:';

  /**
   * Hydrates memory for a specific run or ticket.
   */
  static async hydrate(identifier: string): Promise<HydratedMemory> {
    const redis = getRedisClient();
    const memoryManager = new MemoryManager(); // MemoryManager has static-like methods but usually instantiated if needed

    // Try to get existing history
    const historyKey = `history:${identifier}`;
    const historyRaw = await redis.get(historyKey);
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    // Get last outcome if any
    const outcomeKey = `outcome:${identifier}`;
    const lastOutcome = await redis.get(outcomeKey) || undefined;

    // Get active ticket ID from a mapping if identifier is a thread/runId
    const ticketIdKey = `run_to_ticket:${identifier}`;
    const mappedTicketId = (await redis.get(ticketIdKey) || '').trim();
    const explicitTicketPattern = /^[A-Z][A-Z0-9_]+-\d+$/;
    const activeTicketId = mappedTicketId || (explicitTicketPattern.test(identifier) ? identifier : undefined);

    return {
      history,
      lastOutcome,
      activeTicketId,
      metadata: {}
    };
  }

  /**
   * Persists the current run context state for future hydration.
   */
  static async persist(identifier: string, memory: HydratedMemory): Promise<void> {
    const redis = getRedisClient();
    const historyKey = `history:${identifier}`;
    await redis.set(historyKey, JSON.stringify(memory.history), 'EX', 86400 * 7); // 7 days TTL
    
    if (memory.lastOutcome) {
      const outcomeKey = `outcome:${identifier}`;
      await redis.set(outcomeKey, memory.lastOutcome, 'EX', 86400 * 7);
    }
  }
}
