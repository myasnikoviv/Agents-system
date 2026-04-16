import { v4 as uuidv4 } from 'uuid';
import { RuntimeEvent, RuntimeEventType } from '@system/shared';
import { EventStore } from './EventStore';

/**
 * @system/events
 * Decoupled Event Bus Core.
 */

export type EventSubscriber = (event: RuntimeEvent) => Promise<void> | void;

export interface EventBusOptions {
  redisClient?: any; // Generic to avoid direct dependency on ioredis in core
  streamKey?: string;
}

export class EventBusCore {
  private subscribers: Set<EventSubscriber> = new Set();
  private redis: any;
  private streamKey: string;

  constructor(options: EventBusOptions = {}) {
    this.redis = options.redisClient;
    this.streamKey = options.streamKey || 'events:runtime_hub';
  }

  /**
   * Register a persistent side-effect (e.g., Billing, Ledger) as a subscriber.
   */
  public subscribe(handler: EventSubscriber): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  /**
   * Emit an event to the global stream and notify all subscribers.
   */
  public async emit(
    event: Omit<RuntimeEvent, 'id' | 'timestamp'>
  ): Promise<string> {
    const fullEvent: RuntimeEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    let messageId = 'local-' + fullEvent.id;

    // 1. Persist to Redis Stream (if client provided)
    if (this.redis && typeof this.redis.xadd === 'function') {
      try {
        const result = await this.redis.xadd(
          this.streamKey,
          '*',
          'data',
          JSON.stringify(fullEvent)
        );
        if (result) messageId = result;
      } catch (err) {
        console.error(`[EventBus] Redis emission failed for ${fullEvent.type}:`, err);
      }
    }

    // 2. Notify Subscribers (Side-effects)
    // We run them in parallel but ensure they don't block the caller if they fail.
    const tasks = Array.from(this.subscribers).map(async (handler) => {
      try {
        await handler(fullEvent);
      } catch (err) {
        console.error(`[EventBus] Subscriber failed for ${fullEvent.type}:`, err);
      }
    });

    // Note: We don't await tasks here if we want absolute non-blocking,
    // but usually, for the monolith, we want internal consistency.
    await Promise.all(tasks);

    return messageId;
  }
}

export * from './types';
export * from './EventValidation';
export * from './EventStore';

// Singleton for easy access, though DI is preferred
export const globalEventBus = new EventBusCore();

/**
 * Legacy compatibility helper: emitEvent
 */
export const emitEvent = (event: Omit<RuntimeEvent, 'id' | 'timestamp'>): Promise<string> => {
  return globalEventBus.emit(event);
};

/**
 * Legacy compatibility helper: emitSwarmEvent
 */
export const emitSwarmEvent = async (
  type: RuntimeEventType,
  context: any, // context is passed as any to avoid circularity with runtime
  payload: Record<string, any> = {}
): Promise<string> => {
  return globalEventBus.emit({
    type,
    runId: context.runId,
    projectId: context.activeTicketId || 'none',
    chainId: context.threadId || 'none',
    actor: {
      type: 'agent',
      id: context.agent?.slug || 'unknown',
      role: context.agent?.slug || 'unknown',
    },
    payload
  });
};

/**
 * Legacy compatibility helper: emitGuardBlockEvent
 */
export const emitGuardBlockEvent = async (
  context: {
    runId: string;
    projectId: string;
    chainId: string;
  },
  payload: Record<string, any>
): Promise<string> => {
  return globalEventBus.emit({
    type: 'guard.block',
    runId: context.runId,
    projectId: context.projectId,
    chainId: context.chainId,
    actor: {
      type: 'system',
      id: 'governance-engine',
    },
    payload,
  });
};

/**
 * Utility to fetch recent events. 
 * Note: This requires redis client to be injected into globalEventBus.
 */
export const fetchRecentEvents = async (count: number = 100): Promise<RuntimeEvent[]> => {
  // This is a placeholder for the logic in EventStore.ts or similar
  // For now, return empty as the monolith was relying on a shared global state
  // that is being reorganized.
  return [];
};

/**
 * Utility to fetch events for a run.
 */
export const fetchEventsByRunId = async (input: { runId: string; projectId?: string }): Promise<RuntimeEvent[]> => {
  return EventStore.getEventsByRunId(input.runId);
};
