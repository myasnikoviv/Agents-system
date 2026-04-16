import { EventStore } from '@system/events';

export interface EventEvidenceSnapshot {
  total: number;
  stageStarted: number;
  agentStarted: number;
  handoffs: number;
}

export async function collectEventEvidence(runId: string): Promise<EventEvidenceSnapshot> {
  const events = await EventStore.getEventsByRunId(runId);
  const stageStarted = events.filter((e: any) => String(e.type || e.event_type) === 'stage.started').length;
  const agentStarted = events.filter((e: any) => String(e.type || e.event_type) === 'agent.started').length;
  const handoffs = events.filter((e: any) => {
    const t = String(e.type || e.event_type);
    return t === 'swarm.handoff' || t === 'swarm_handoff';
  }).length;
  return {
    total: events.length,
    stageStarted,
    agentStarted,
    handoffs,
  };
}
