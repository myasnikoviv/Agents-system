import { logGovernance } from './GovernanceLogger';

/**
 * ENF-005 — Agent Participation Soft Gate
 * 
 * Ensures every active agent participates in the cognitive loop:
 * perceive -> think -> plan -> act -> reflect
 * 
 * Since this is a soft gate, it logs a warning if these patterns are missing.
 */

export interface ParticipationCheckInput {
  agentSlug: string;
  ticketId: string;
  content: string;
}

export function logParticipationGate(input: ParticipationCheckInput) {
  const content = input.content.toLowerCase();
  const markers = [
    'perceive', 'think', 'plan', 'act', 'reflect',
    'сприйняття', 'думка', 'план', 'дія', 'рефлексія',     // UK
    'восприятие', 'мысль', 'план', 'действие', 'рефлексия' // RU
  ];

  // For ENF-005 MVP, search for ANY of these markers or specific structured headers.
  // AGENTS.md requires these for cognitive loops.
  
  const found = markers.some(m => content.includes(m));

  if (found) {
    logGovernance({
      rule: 'agent_participation',
      status: 'pass',
      action: 'allow',
      ticket: input.ticketId,
      detail: `agent=${input.agentSlug}, cognitive_loop_markers_detected`,
    });
  } else {
    // FAIL soft gate → log + warn, but allow
    logGovernance({
      rule: 'agent_participation',
      status: 'fail',
      action: 'allow',
      ticket: input.ticketId,
      detail: `agent=${input.agentSlug}, cognitive_loop_markers_missing`,
    });
  }
}
