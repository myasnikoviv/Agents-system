import { executeQuasiLinearRun, resumeQuasiLinearRun, type PilotState } from './PilotQuasiLinearGraph';
import { runGovernancePhase } from '../governance/GovernanceEngineCore';
import { analyzeTaskForCompliance } from '../compliance/TaskAnalyzer';
import { buildExecutionPlan } from '../compliance/ExecutionPlanBuilder';
import { collectComplianceActualEvidence } from '../compliance/ComplianceEvidenceCollector';
import { evaluateCompliance } from '../compliance/ComplianceEvaluator';
import { applyComplianceEnforcement } from '../compliance/ComplianceEnforcementLoop';
import { writeComplianceLedger } from '../compliance/ComplianceLedger';
import { logGovernance } from '../governance/GovernanceLogger';
import {
  collectRunCostMetrics,
  decideAdaptiveOptimization,
  enforceHardCostLimit,
  writeCostLedger,
} from '../cost/CostOptimizationEngine';

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
  const ticket = initialState.ticketId || 'AGSYS-UNKNOWN';
  const pipeline = initialState.selected_pipeline || 'unified-task-intake';
  const runId = initialState.runId || `run-${Date.now()}`;
  const chainId = initialState.threadId || `thread-${Date.now()}`;
  const projectId = initialState.projectId || 'agent_system';
  const workspacePath = initialState.workspacePath || process.cwd();
  const adaptive = decideAdaptiveOptimization(workspacePath, projectId);
  process.env.RUNTIME_MAX_RETRIES_PER_STEP = String(adaptive.suggestedMaxRetriesPerStep);
  process.env.GOVERNANCE_SMART_SKIP_IMPROVEMENT_LOOP = adaptive.lowRisk ? 'true' : 'false';
  const userMessage =
    [...(initialState.messages || [])]
      .reverse()
      .find((m) => m.role === 'user')?.content || '';

  // Sprint 5.5 — Identify if pipeline involves mutating actions (ENF-001 logic)
  const mutatingPipelines = ['new-feature', 'bug-fix', 'hotfix', 'refactor', 'strategy-tuning', 'release', 'rollback-incident'];
  const hasMutatingAction = mutatingPipelines.includes(pipeline) && modeRequested !== 'mock';

  const analyzedPlan = analyzeTaskForCompliance({
    runId,
    projectId,
    ticketId: ticket,
    message: userMessage,
    requestedPipeline: pipeline,
    requestedAgents: initialState.customAgents || [],
  });
  const executionPlan = buildExecutionPlan(analyzedPlan);
  const planRequired = Boolean(
    executionPlan.pipeline &&
      executionPlan.agents.length > 0 &&
      executionPlan.skills.length > 0 &&
      executionPlan.stages.length > 0,
  );
  if (!planRequired) {
    logGovernance({
      rule: 'plan_required',
      status: 'fail',
      action: 'block',
      ticket,
      runId,
      chainId,
      detail: 'pre_execution_plan_missing_or_incomplete',
    });
    throw new Error(`[CompliancePhase:before_execution] blocked ticket=${ticket} reason=plan_required`);
  }

  const beforeExecution = await runGovernancePhase('before_execution', {
    runId,
    ticketId: ticket,
    chainId,
    projectId,
    workspacePath,
    pipelineId: pipeline,
    hasMutatingAction,
  });
  if (beforeExecution.blocked) {
    throw new Error(
      `[GovernancePhase:before_execution] blocked ticket=${ticket} action=${beforeExecution.action}`,
    );
  }

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

  await runGovernancePhase('after_execution', {
    runId,
    ticketId: ticket,
    chainId,
    projectId,
    workspacePath,
    pipelineId: pipeline,
    hasMutatingAction,
  });

  const actual = await collectComplianceActualEvidence({
    runId,
    fallbackPipeline: pipeline,
    workspacePath,
  });
  const compliance = evaluateCompliance(executionPlan, actual);
  const decision = applyComplianceEnforcement(compliance);
  const complianceLedgerPath = writeComplianceLedger(compliance, decision, workspacePath);
  logGovernance({
    rule: 'compliance_engine',
    status: compliance.passed ? 'pass' : 'fail',
    action: decision.action === 'allow' ? 'allow' : decision.action === 'retry' ? 'retry' : 'warn',
    ticket,
    runId,
    chainId,
    detail: `decision=${decision.action};ledger=${complianceLedgerPath}`,
  });

  const cost = collectRunCostMetrics(workspacePath, runId, projectId);
  const costLedgerPath = writeCostLedger(cost, workspacePath);
  const costLimit = enforceHardCostLimit(cost, workspacePath);
  logGovernance({
    rule: 'cost_optimization_engine',
    status: costLimit.allowed ? 'pass' : 'fail',
    action: costLimit.allowed ? 'allow' : 'block',
    ticket,
    runId,
    chainId,
    detail: `tokens=${cost.tokens};threshold=${costLimit.threshold};retries=${cost.retries};loops=${cost.loops};ledger=${costLedgerPath}`,
  });
  if (!costLimit.allowed) {
    throw new Error(
      `[CostPhase:hard_limit] blocked ticket=${ticket} run=${runId} tokens=${cost.tokens} threshold=${costLimit.threshold}`,
    );
  }

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
