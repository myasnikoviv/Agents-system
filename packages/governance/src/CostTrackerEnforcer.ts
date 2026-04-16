import { logGovernance } from './GovernanceLogger';

/**
 * ENF-007 — Cost Tracking Light
 * 
 * Tracks resource/token consumption per task/run to provide observability into costs.
 * This is a transparent/passive governance gate.
 */

export interface CostTrackerInput {
  ticketId: string;
  runId: string;
  chainId?: string;
  agentSlug: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function logCostTrackerGate(input: CostTrackerInput) {
  // Estimated cost (rough calculation)
  // assuming $10 / 1M tokens combined as a very rough average
  const estimatedCostUsd = (input.totalTokens / 1000000) * 10;

  logGovernance({
    rule: 'cost_tracking',
    status: 'pass',
    action: 'allow',
    ticket: input.ticketId,
    runId: input.runId,
    chainId: input.chainId,
    // Add multiple details as a single text for structured log (or add an object to logEntry later)
    detail: `agent=${input.agentSlug}, runId=${input.runId}, tokens=${input.totalTokens}, est_cost=$${estimatedCostUsd.toFixed(4)}`,
  });
}
