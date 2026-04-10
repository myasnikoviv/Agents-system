import { getRedisClient } from '../redisClient';
import { v4 as uuidv4 } from 'uuid';
import { appendRunLedger } from '../RunLedger';
import { syncPlaneLifecycleForEvent } from '../PlaneLifecycleOrchestrator';
import { RunContext } from '../context/RunContext';
import { RuntimeEvent, RuntimeEventType } from './types';
import { validateCanonicalEventInput } from './EventValidation';
import { usageMeteringPipeline } from '../billing/UsageMeteringPipeline';

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
  validateCanonicalEventInput(event);
  
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

    // Event-driven usage metering collection (idempotent by event id).
    usageMeteringPipeline.process(fullEvent);
    
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

export const fetchEventsByRunId = async (
  input: { runId: string; projectId?: string; count?: number },
): Promise<RuntimeEvent[]> => {
  const runId = String(input.runId || '').trim();
  if (!runId) return [];
  const projectId = String(input.projectId || '').trim();
  const count = Math.max(1, Math.min(5000, Number(input.count || 2000)));
  const redis = getRedisClient();
  try {
    const rawEvents = await redis.xrevrange(EVENT_STREAM_KEY, '+', '-', 'COUNT', count);
    const parsed = rawEvents
      .map((raw: any) => {
        const payloadString = raw?.[1]?.[1];
        try {
          return JSON.parse(payloadString) as RuntimeEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is RuntimeEvent => Boolean(e))
      .filter((e) => String(e.runId || '') === runId)
      .filter((e) => (projectId ? String(e.projectId || '') === projectId : true))
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    return parsed;
  } catch (error) {
    console.error('Failed to fetch run events:', error);
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

/**
 * Helper to emit governance events for UI observability.
 */
export const emitGovernanceEvent = async (
  entry: Record<string, any>
): Promise<string> => {
  return emitEvent({
    type: 'governance.rule_check',
    runId: entry.runId || 'none',
    projectId: entry.ticket || 'none',
    chainId: entry.chainId || 'none',
    actor: {
      type: 'system',
      id: 'governance-engine',
    },
    payload: entry
  });
};

/**
 * Canonical guard block signal for hard governance/compliance/cost stops.
 */
export const emitGuardBlockEvent = async (
  context: {
    runId: string;
    projectId: string;
    chainId: string;
  },
  payload: Record<string, any>
): Promise<string> => {
  return emitEvent({
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

export const emitGuardEscalationEvent = async (
  context: {
    runId: string;
    projectId: string;
    chainId: string;
  },
  payload: Record<string, any>
): Promise<string> => {
  return emitEvent({
    type: 'guard.escalate',
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
