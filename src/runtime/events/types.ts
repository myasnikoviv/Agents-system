/**
 * Runtime Stabilization & Observability Foundation
 * Sprint 1 - Epic 1 & 2
 */

export type RuntimeEventType =
  | 'run.started'
  | 'run.completed'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.message'
  | 'system.thought'
  | 'swarm.handoff'
  | 'tool.call'
  | 'tool.result'
  | 'guard.triggered'
  | 'guard.retry'
  | 'llm.request'
  | 'llm.response'
  | 'agent.failed'
  | 'run.failed';

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
