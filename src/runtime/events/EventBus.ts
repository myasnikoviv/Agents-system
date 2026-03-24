import { getRedisClient } from '../redisClient';
import { v4 as uuidv4 } from 'uuid';
import { appendRunLedger } from '../RunLedger';
import { syncPlaneLifecycleForEvent } from '../PlaneLifecycleOrchestrator';
import { RunContext } from '../context/RunContext';

export interface RuntimeEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  plane_issue_id: string;
  pipeline_run_id: string;
  thread_id: string;
  agent_role: string;
  source_stage: string;
  target_stage?: string;
  status: 'pending' | 'success' | 'failed' | 'in_progress' | string;
  payload?: any;
  correlation_id: string;
  causation_id?: string;
}

const EVENT_STREAM_KEY = 'events:runtime_hub';

/**
 * Emits an event to the global Redis stream.
 */
export const emitEvent = async (event: Omit<RuntimeEvent, 'event_id' | 'timestamp'>): Promise<string> => {
  const redis = getRedisClient();
  
  const fullEvent: RuntimeEvent = {
    ...event,
    event_id: uuidv4(),
    timestamp: new Date().toISOString(),
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
    await appendRunLedger(fullEvent);
    // Best-effort sync hooks. Never break runtime on sync failure in downstream handlers.
    await syncPlaneLifecycleForEvent(fullEvent);
    return messageId;
  } catch (error) {
    console.error(`Failed to emit event ${event.event_type}:`, error);
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
      // raw is like: [ '1646...-0', [ 'data', '{"event_id":...}' ] ]
      const payloadString = raw[1][1];
      return JSON.parse(payloadString) as RuntimeEvent;
    });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
};

/**
 * Helper for swarm-specific events to ensure consistency.
 */
export const emitSwarmEvent = async (
  type: 'run.started' | 'stage.started' | 'tool.called' | 'artifact.written' | 'run.completed',
  context: RunContext,
  payload: any = {}
): Promise<string> => {
  return emitEvent({
    event_type: type,
    pipeline_run_id: context.runId,
    thread_id: context.threadId || 'none',
    agent_role: context.agent.slug,
    source_stage: context.pipeline.currentStageId,
    plane_issue_id: context.activeTicketId || '',
    status: type === 'run.completed' ? 'success' : 'in_progress',
    correlation_id: context.runId,
    payload
  });
};
