import { getRedisClient } from '../redisClient';
import { v4 as uuidv4 } from 'uuid';
import { appendRunLedger } from '../RunLedger';
import { syncPlaneLifecycleForEvent } from '../PlaneLifecycleOrchestrator';
import { RunContext } from '../context/RunContext';
import { RuntimeEvent, RuntimeEventType } from './types';

export { RuntimeEvent, RuntimeEventType };

const EVENT_STREAM_KEY = 'events:runtime_hub';
const KNOWN_EVENT_TYPES = new Set<string>([
  'run.started',
  'run.completed',
  'run.cancelled',
  'agent.started',
  'agent.completed',
  'agent.message',
  'research.completed',
  'system.thought',
  'swarm.handoff',
  'tool.call',
  'tool.result',
  'guard.triggered',
  'guard.block',
  'guard.retry',
  'guard.escalate',
  'llm.request',
  'llm.response',
  'agent.failed',
  'agent.waiting_for_approval',
  'governance.rule_check',
  'run.failed',
]);

function validateCanonicalEventInput(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): void {
  if (!event.type || typeof event.type !== 'string') {
    throw new Error('RuntimeEvent validation failed: missing type');
  }
  if (!KNOWN_EVENT_TYPES.has(event.type)) {
    throw new Error(`RuntimeEvent validation failed: unknown type "${event.type}"`);
  }
  if (!event.runId || !event.projectId || !event.chainId) {
    throw new Error('RuntimeEvent validation failed: runId/projectId/chainId are required');
  }
  if (!event.payload || typeof event.payload !== 'object') {
    throw new Error('RuntimeEvent validation failed: payload must be an object');
  }
}

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
