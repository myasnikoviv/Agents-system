/**
 * Runtime Stabilization & Observability Foundation
 * Sprint 1 - Epic 1 & 2
 */

export type RuntimeEventType =
  | 'run.started'
  | 'run.completed'
  | 'run.cancelled'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.message'
  | 'research.completed'
  | 'system.thought'
  | 'swarm.handoff'
  | 'tool.call'
  | 'tool.result'
  | 'guard.triggered'
  | 'guard.block'
  | 'guard.retry'
  | 'guard.escalate'
  | 'llm.request'
  | 'llm.response'
  | 'agent.failed'
  | 'agent.waiting_for_approval'
  | 'governance.rule_check'
  | 'run.failed'
  | 'worker.starting'
  | 'worker.spawned'
  | 'worker.reused'
  | 'worker.failed'
  | 'worker.state_changed'
  | 'worker.heartbeat'
  | 'worker.unhealthy'
  | 'worker.lock_acquired'
  | 'worker.lock_released'
  | 'runtime.fallback_active'
  | 'task.queued'
  | 'task.dispatched'
  | 'usage.token_usage'
  | 'usage.tool_execution'
  | 'usage.runtime_time'
  | 'usage.storage_usage'
  | 'usage.mcp_usage';

export interface RuntimeEvent {
  id: string;
  runId: string;
  projectId: string;
  chainId: string;
  type: RuntimeEventType;
  actor?: {
    type: 'agent' | 'system';
    id: string;
    role?: string;
  };
  payload: Record<string, any>;
  timestamp: number;
}

export interface LLMTrace {
  requestId: string;
  runId: string;
  model: string;
  provider: 'codex-cli' | 'openhands' | 'claude-cli' | string;
  prompt: string;
  response: string;
  tokensInput: number;
  tokensOutput: number;
  durationMs: number;
  source: 'agent' | 'guard' | 'retry' | 'system';
  timestamp: number;
}
