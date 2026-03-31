import { getRedisClient } from '../redisClient';
import { v4 as uuidv4 } from 'uuid';
import { appendRunLedger } from '../RunLedger';
import { syncPlaneLifecycleForEvent } from '../PlaneLifecycleOrchestrator';
import { RunContext } from '../context/RunContext';
import { RuntimeEvent, RuntimeEventType } from './types';

export { RuntimeEvent, RuntimeEventType };

const EVENT_STREAM_KEY = 'events:runtime_hub';

/**
 * Emits an event to the global Redis stream.
 * Sole authoritative source of truth for runtime activity.
 */
export const emitEvent = async (
  event: Omit<RuntimeEvent, 'id' | 'timestamp'>
): Promise<string> => {
  const redis = getRedisClient();
  
  const fullEvent: RuntimeEvent = {
    ...event,
    id: uuidv4(),
    timestamp: Date.now(),
  };

  try {
    // Add to Redis Stream
    const messageId = await redis.xadd(
      EVENT_STREAM_KEY,
      '*', // auto-generate ID
      'data',
      JSON.stringify(fullEvent)
    );
    
    if (!messageId) {
       throw new Error("Failed to emit event: Redis xadd returned null.");
    }

    // Persist to local ledger
    await appendRunLedger(fullEvent);
    
    // Best-effort sync hooks (Plane, etc.)
    await syncPlaneLifecycleForEvent(fullEvent).catch(err => {
      console.warn(`[EventBus] Sync hook failed for ${fullEvent.type}:`, err.message);
    });

    return messageId;
  } catch (error) {
    console.error(`Failed to emit event ${event.type}:`, error);
    throw error;
  }
};

/**
 * Utility to fetch recent events for debugging or dashboarding.
 */
export const fetchRecentEvents = async (count: number = 100): Promise<RuntimeEvent[]> => {
  const redis = getRedisClient();
  try {
    const rawEvents = await redis.xrevrange(EVENT_STREAM_KEY, '+', '-', 'COUNT', count);
    
    return rawEvents.map((raw: any) => {
      const payloadString = raw[1][1];
      return JSON.parse(payloadString) as RuntimeEvent;
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
};

/**
 * Helper for agent/swarm events ensure consistency with the new schema.
 */
export const emitSwarmEvent = async (
  type: RuntimeEventType,
  context: RunContext,
  payload: Record<string, any> = {}
): Promise<string> => {
  return emitEvent({
    type,
    runId: context.runId,
    projectId: context.activeTicketId || 'none',
    chainId: context.threadId || 'none',
    actor: {
      type: 'agent',
      id: context.agent.slug,
      role: context.agent.slug,
    },
    payload
  });
};
