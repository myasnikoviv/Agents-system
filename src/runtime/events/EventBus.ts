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
  'agent.started',
  'agent.completed',
  'agent.message',
  'system.thought',
  'swarm.handoff',
  'tool.call',
  'tool.result',
  'guard.triggered',
  'guard.retry',
  'llm.request',
  'llm.response',
  'agent.failed',
  'agent.waiting_for_approval',
  'governance.rule_check',
  'run.failed',
]);

function normalizeEventInput(event: Record<string, any>): Omit<RuntimeEvent, 'id' | 'timestamp'> {
  const normalizedType = String(event.type || event.event_type || '').trim();
  const normalizedRunId = String(event.runId || event.pipeline_run_id || 'none').trim();
  const normalizedProjectId = String(event.projectId || event.plane_issue_id || 'none').trim();
  const normalizedChainId = String(event.chainId || event.thread_id || 'none').trim();
  const actorRole = String(event?.actor?.role || event.agent_role || '').trim();
  const actorId = String(event?.actor?.id || actorRole || 'system').trim();
  const actorType = event?.actor?.type === 'agent' ? 'agent' : 'system';

  const normalized: Omit<RuntimeEvent, 'id' | 'timestamp'> = {
    type: normalizedType as RuntimeEventType,
    runId: normalizedRunId || 'none',
    projectId: normalizedProjectId || 'none',
    chainId: normalizedChainId || 'none',
    actor: {
      type: actorType,
      id: actorId,
      role: actorRole || undefined,
    },
    payload: (event.payload && typeof event.payload === 'object') ? event.payload : {},
  };

  return normalized;
}

function validateCanonicalEventInput(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): void {
  if (!event.type || typeof event.type !== 'string') {
    throw new Error('RuntimeEvent validation failed: missing type');
  }
  if (!KNOWN_EVENT_TYPES.has(event.type)) {
    console.warn(`[EventBus] Unknown event type "${event.type}" accepted via compatibility mode`);
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
  event: Omit<RuntimeEvent, 'id' | 'timestamp'> | Record<string, any>
): Promise<string> => {
  const redis = getRedisClient();
  const normalizedInput = normalizeEventInput(event as Record<string, any>);
  validateCanonicalEventInput(normalizedInput);
  
  const fullEvent: RuntimeEvent = {
    ...normalizedInput,
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
    console.error(`Failed to emit event ${(event as any)?.type || (event as any)?.event_type || 'unknown'}:`, error);
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
