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
 * Runtime execution dispatcher.
 *
 * Why this exists:
 * - `/api/chat` should not be tightly coupled to a concrete graph implementation name.
 * - mode selection must be explicit and centrally managed.
 */
export async function executeRuntimeRun(initialState: Partial<PilotState>): Promise<RuntimeExecutionResult> {
  const modeRequested = normalizeMode(initialState.executionOptions?.mode);

  if (modeRequested === 'mock') {
    return {
      finalState: buildMockFinalState(initialState),
      modeRequested,
      modeApplied: 'mock',
      engine: 'mock',
    };
  }

  // Current production engine for both linear and multiple_agents modes.
  // Kept explicit here so that true engine split can be added without touching API handlers.
  const finalState = await executeQuasiLinearRun(initialState);
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
