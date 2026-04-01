import { executeQuasiLinearRun, resumeQuasiLinearRun, type PilotState } from './PilotQuasiLinearGraph';

export type RuntimeExecutionMode = 'mock' | 'linear' | 'multiple_agents';

export interface RuntimeExecutionResult {
  finalState: any;
  modeRequested: RuntimeExecutionMode;
  modeApplied: RuntimeExecutionMode;
  engine: 'mock' | 'pilot-unified-graph';
}

function normalizeMode(modeRaw: unknown): RuntimeExecutionMode {
  const value = String(modeRaw || '').trim();
  if (value === 'mock' || value === 'linear' || value === 'multiple_agents') return value;
  return 'multiple_agents';
}

function buildMockFinalState(initialState: Partial<PilotState>) {
  const userMessage =
    [...(initialState.messages || [])]
      .reverse()
      .find((m) => m.role === 'user')?.content || '';

  const mockResponse = userMessage
    ? `Mock mode is enabled. Request captured: "${userMessage.slice(0, 180)}${userMessage.length > 180 ? '…' : ''}".`
    : 'Mock mode is enabled. Request captured.';

  return {
    ...initialState,
    status: 'completed',
    selected_pipeline: initialState.selected_pipeline || 'unified-task-intake',
    messages: [...(initialState.messages || []), { role: 'assistant', content: mockResponse }],
    artifactLogs: [...(initialState.artifactLogs || []), `[stage:mock] [role:System] [status:completed] message=${mockResponse}`],
  };
}

/**
 * Runtime execution dispatcher with Governance Gates integrated (Sprint 5.5).
 */
export async function executeRuntimeRun(initialState: Partial<PilotState>): Promise<RuntimeExecutionResult> {
  const modeRequested = normalizeMode(initialState.executionOptions?.mode);
  const ticket = initialState.plane_issue_id || 'AGSYS-UNKNOWN';
  const pipeline = initialState.selected_pipeline || 'unified-task-intake';

  // Sprint 5.5 — Identify if pipeline involves mutating actions (ENF-001 logic)
  const mutatingPipelines = ['new-feature', 'bug-fix', 'hotfix', 'refactor', 'strategy-tuning', 'release', 'rollback-incident'];
  const hasMutatingAction = mutatingPipelines.includes(pipeline) && modeRequested !== 'mock';

  // 1. ENF-001 — Git Preflight Hard Gate
  // This will throw if it's a mutating action without a valid preflight token.
  const { enforcePreflightGate } = await import('../governance/PreflightEnforcer');
  enforcePreflightGate({
    ticket,
    hasMutatingAction,
    workspacePath: initialState.workspacePath // Pass workspace if needed for token resolution
  } as any);

  if (modeRequested === 'mock') {
    return {
      finalState: buildMockFinalState(initialState),
      modeRequested,
      modeApplied: 'mock',
      engine: 'mock',
    };
  }

  // Current production engine for both linear and multiple_agents modes.
  const finalState = await executeQuasiLinearRun(initialState);

  // 2. ENF-006 — Pipeline Usage Soft Gate (log classification result from router node)
  // This is best logged inside routerNode in PilotQuasiLinearGraph, 
  // but we can add a high-level log here as a secondary check.

  return {
    finalState,
    modeRequested,
    modeApplied: modeRequested,
    engine: 'pilot-unified-graph',
  };
}
export async function resumeRuntimeRun(threadId: string, decision: any): Promise<RuntimeExecutionResult> {
  const finalState = await resumeQuasiLinearRun(threadId, decision);
  return {
    finalState,
    modeRequested: 'multiple_agents',
    modeApplied: 'multiple_agents',
    engine: 'pilot-unified-graph',
  };
}
