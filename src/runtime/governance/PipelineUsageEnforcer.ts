import { logGovernance } from './GovernanceLogger';

/**
 * ENF-006 — Pipeline Usage Soft Gate
 * 
 * Ensures every user request maps to exactly one pipeline before any other action.
 * Maps to PI-ENF-006 global rules.
 */

export interface PipelineUsageInput {
  ticketId: string;
  pipelineId: string;
  isExplicit: boolean;
  confidence: number;
}

export function logPipelineUsageGate(input: PipelineUsageInput) {
  // If pipeline is 'unified-task-intake' and it was a "default" (non-explicit), warn.
  const isDefaultIntake = 
    input.pipelineId === 'unified-task-intake' && !input.isExplicit;

  if (isDefaultIntake && input.confidence < 0.3) {
    logGovernance({
      rule: 'pipeline_usage',
      status: 'fail',
      action: 'allow',
      ticket: input.ticketId,
      detail: `low_confidence_fallback: confidence=${input.confidence.toFixed(2)}`,
    });
  } else {
    logGovernance({
      rule: 'pipeline_usage',
      status: 'pass',
      action: 'allow',
      ticket: input.ticketId,
      detail: `pipeline=${input.pipelineId}, explicit=${input.isExplicit}`,
    });
  }
}
