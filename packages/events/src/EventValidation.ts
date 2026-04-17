import { RuntimeEvent } from '@system/shared';
import { isBillingUsageEventType, validateBillingUsagePayload } from '@system/shared';

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
  'worker.starting',
  'worker.spawned',
  'worker.reused',
  'worker.failed',
  'worker.state_changed',
  'worker.heartbeat',
  'worker.unhealthy',
  'task.queued',
  'task.dispatched',
  'usage.token_usage',
  'usage.tool_execution',
  'usage.runtime_time',
  'usage.storage_usage',
  'usage.mcp_usage',
]);

export function validateCanonicalEventInput(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): void {
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
  if (isBillingUsageEventType(event.type)) {
    const usageValidation = validateBillingUsagePayload(event.payload);
    if (usageValidation.ok === false) {
      throw new Error(`RuntimeEvent validation failed: ${usageValidation.reason}`);
    }
  }
}

