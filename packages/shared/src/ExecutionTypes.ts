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
  | 'usage.mcp_usage'
  | 'runtime.plane.dispatch';

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

/**
 * Execution and Decision Types.
 * Shared across Billing and Runtime.
 */

import { TaskPackage } from './ProjectModels';

export type DetectedLanguage = 'uk' | 'ru' | 'be' | 'en' | 'unknown';

export type ResponseMode = 'handoff' | 'final' | 'clarify' | 'tool_call';

export interface StructuredArtifact {
  runId: string;
  stageId: string;
  roleSlug: string;
  timestamp: string;

  summary: string;
  findings?: string[];
  decisions?: string[];
  risks?: string[];
  blockers?: string[];
  producedFiles?: string[];
  toolCalls?: Array<{
    tool: string;
    status: 'success' | 'failed';
    summary: string;
  }>;

  handoff?: {
    nextRole: string;
    rationale: string;
  };
}

export interface RunContext {
  runId: string;
  threadId: string;
  chainId: string;
  projectId: string;
  tenantId?: string;
  workspaceId?: string;
  environmentId?: string;
  workspacePath: string;

  executionTarget: 'codex-cli' | 'claude-cli' | 'openhands' | 'langchain' | 'direct';
  provider: string;
  model: string;
  sandboxMode?: string;

  task: {
    rawUserInput: string;
    normalizedGoal: string;
    taskType: string;
    responseLanguage?: DetectedLanguage;
    acceptanceCriteria?: string[];
    mode?: 'EXECUTION' | 'VERIFICATION';
  };

  pipeline: {
    id: string;
    title: string;
    currentStageId: string;
    currentStageTitle: string;
    stepIndex: number;
    allowedNextStages: string[];
  };

  agent: {
    slug: string;
    title: string;
    mission: string;
    instructions: string;
    skills: string[]; // Added for telemetry
    handoffPolicy?: string;
    workerId?: string;
    identityKey?: string;
    memoryNamespace?: string;
  };

  workPackage?: TaskPackage; // Added for autonomous execution (Sprint 4)

  artifacts: {
    priorOutputs: StructuredArtifact[];
  };

  memory: {
    threadHistory: Array<{
      role: 'user' | 'assistant' | 'observation';
      content: string;
      tool_call_id?: string;
      tool_calls?: any[];
      tool_name?: string;
      rawParts?: any[];
    }>;
    sharedFacts: Record<string, unknown>;
    runDecisions: Record<string, unknown>;
    handoffContext?: {
      fromRole: string;
      toRole: string;
      summary: string;
      rationale: string;
    };
  };

  tools: Array<{
    name: string;
    description: string;
    schema?: object;
    source: 'static' | 'dynamic' | 'mcp';
  }>;

  outputContract: {
    responseMode: ResponseMode;
    requiredSections: string[];
    mustWriteArtifactLog: boolean;
    mustEmitEvent: boolean;
  };

  guardrails: {
    allowedActions: string[];
    blockedActions: string[];
    requireApprovalFor?: string[];
  };

  activeTicketId?: string; // Added for tracking
  startTime: string;
}

export type ModelTier = 'cheap' | 'medium' | 'expensive';

export interface ModelRouteDecision {
  runId: string;
  projectId: string;
  taskType: string;
  modelTier: ModelTier;
  model: string;
  reason: string;
}

export interface PlannerDecision {
  pipeline: string;
  agents: string[];
  skills: string[];
  stages: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'deterministic-planner';
  reason: string;
}

export type BillingUsageEventType =
  | 'usage.token_usage'
  | 'usage.tool_execution'
  | 'usage.runtime_time'
  | 'usage.storage_usage'
  | 'usage.mcp_usage';

export interface BillingUsageEventPayload {
  tenantId: string;
  workspaceId: string;
  userId: string;
  quantity: number;
  unit?: string;
  meta?: Record<string, any>;
}

export function isBillingUsageEventType(type: string): type is BillingUsageEventType {
  return (
    type === 'usage.token_usage' ||
    type === 'usage.tool_execution' ||
    type === 'usage.runtime_time' ||
    type === 'usage.storage_usage' ||
    type === 'usage.mcp_usage'
  );
}

export function validateBillingUsagePayload(payload: Record<string, any>): { ok: true } | { ok: false; reason: string } {
  const tenantId = String(payload?.tenantId || '').trim();
  const workspaceId = String(payload?.workspaceId || '').trim();
  const userId = String(payload?.userId || '').trim();
  const quantity = Number(payload?.quantity);

  if (!tenantId) return { ok: false, reason: 'usage_payload_missing_tenant_id' };
  if (!workspaceId) return { ok: false, reason: 'usage_payload_missing_workspace_id' };
  if (!userId) return { ok: false, reason: 'usage_payload_missing_user_id' };
  if (!Number.isFinite(quantity) || quantity < 0) return { ok: false, reason: 'usage_payload_invalid_quantity' };

  return { ok: true };
}

export interface ModelRouteDecision {
  runId: string;
  projectId: string;
  taskType: string;
  modelTier: ModelTier;
  model: string;
  reason: string;
}

export interface PlannerDecision {
  pipeline: string;
  agents: string[];
  skills: string[];
  stages: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'deterministic-planner';
  reason: string;
}
