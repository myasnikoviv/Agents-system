import { executeUnifiedSwarmRun, resumeUnifiedSwarmRun, type PilotState } from './UnifiedSwarmGraph';
import { executeMultipleAgentsRun } from './MultipleAgentsRuntime';
import { runGovernancePhase } from '@system/governance';
import { collectComplianceActualEvidence } from '../compliance/ComplianceEvidenceCollector';
import { evaluateCompliance } from '../compliance/ComplianceEvaluator';
import { applyComplianceEnforcement } from '../compliance/ComplianceEnforcementLoop';
import { writeComplianceLedger } from '../compliance/ComplianceLedger';
import { logGovernance } from '@system/governance';
import { buildPlannerDecision } from '../planner/PlannerEngine';
import { resolveAdaptivePipelineRoute } from '../planner/AdaptivePipelineRouter';
import { applyPerformanceFeedbackOrder, collectAgentPerformanceScores } from '../performance/PerformanceFeedback';
import {
  collectRunCostMetrics,
  decideAdaptiveOptimization,
  enforceBudgetConstraints,
  enforceHardCostLimit,
  writeCostLedger,
} from '@system/billing';
import {
  collectLearningSignals,
  decideAdaptivePolicy,
  enforceBoundedAdaptation,
  applyCostAwareTierPolicy,
  applyRoutingPolicies,
  routeModelForTask,
  writeAdaptiveLog,
} from '../adaptive/AdaptiveIntelligenceEngine';
import {
  aggregateSignals,
  buildImprovementTicketDrafts,
  enqueueImprovementJob,
  evaluateLearningEffectKpi,
  evaluateLearningTrendKpi,
  generateImprovementSignals,
  queueIsolationKeys,
  writeTemplateUpdateProposal,
  writeImprovementArtifacts,
} from '../improvement/ImprovementEngine';
import { emitEvent, emitGuardBlockEvent } from '@system/events';
import { evaluatePreExecutionQuota } from '@system/billing';
import { enforceBillingRuntimePolicy } from '@system/billing';

export type RuntimeExecutionMode = 'linear' | 'multiple_agents';

export interface RuntimeExecutionResult {
  finalState: any;
  modeRequested: RuntimeExecutionMode;
  modeApplied: RuntimeExecutionMode;
  engine: 'pilot-unified-graph' | 'pilot-multiple-agents-runtime';
}

async function withExecutionTimeout<T>(input: {
  task: Promise<T>;
  timeoutMs: number;
  timeoutError: Error;
}): Promise<T> {
  const timeoutMs = Math.max(1000, Number(input.timeoutMs || 0));
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      input.task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(input.timeoutError), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function hasStrictTicketContext(ticketId: string): boolean {
  const value = String(ticketId || '').trim();
  if (!value || value === 'AGSYS-UNKNOWN' || value.toLowerCase() === 'none') return false;
  return /^[A-Z][A-Z0-9_-]*-\d+$/.test(value);
}

/**
 * Runtime execution dispatcher with Governance Gates integrated (Sprint 5.5).
 */
export async function executeRuntimeRun(initialState: Partial<PilotState>): Promise<RuntimeExecutionResult> {
  const requestedModeRaw = String((initialState as any)?.executionMode || '').trim();
  const modeRequested: RuntimeExecutionMode =
    requestedModeRaw === 'linear' || requestedModeRaw === 'multiple_agents'
      ? (requestedModeRaw as RuntimeExecutionMode)
      : 'multiple_agents';
  const ticket = initialState.ticketId || 'AGSYS-UNKNOWN';
  const selectedPipeline = String(initialState.selected_pipeline || '').trim();
  const enforcedPipeline = String((initialState as any).enforcement?.pipeline || '').trim();
  const runId = initialState.runId || `run-${Date.now()}`;
  const chainId = initialState.threadId || `thread-${Date.now()}`;
  const projectId = initialState.projectId || 'agent_system';
  const workspacePath = initialState.workspacePath || process.cwd();
  let modelRoute = routeModelForTask({
    workspacePath,
    runId,
    projectId,
    userMessage:
      [...(initialState.messages || [])]
        .reverse()
        .find((m) => m.role === 'user')?.content || '',
  });
  modelRoute = applyCostAwareTierPolicy({
    workspacePath,
    planName: (initialState as any)?.billing?.plan?.name,
    decision: modelRoute,
  });
  modelRoute = applyRoutingPolicies({
    workspacePath,
    decision: modelRoute,
    mode: (initialState as any)?.routingPolicyMode,
    governanceSignal: (initialState as any)?.governanceSignal,
  });
  process.env.RUNTIME_MODEL_TIER = modelRoute.modelTier;
  process.env.RUNTIME_MODEL_NAME = modelRoute.model;
  logGovernance({
    rule: 'model_router',
    status: 'pass',
    action: 'log',
    ticket,
    runId,
    chainId,
    detail: `taskType=${modelRoute.taskType};tier=${modelRoute.modelTier};model=${modelRoute.model}`,
  });
  const adaptive = decideAdaptiveOptimization(workspacePath, projectId);
  process.env.RUNTIME_MAX_RETRIES_PER_STEP = String(adaptive.suggestedMaxRetriesPerStep);
  process.env.GOVERNANCE_SMART_SKIP_IMPROVEMENT_LOOP = adaptive.lowRisk ? 'true' : 'false';
  // Guardrail defaults must fit full pipeline runs (handoffs + loops), not single LLM calls.
  // They remain overridable via env vars.
  if (!process.env.RUNTIME_MAX_RUN_TIME_MS) {
    process.env.RUNTIME_MAX_RUN_TIME_MS = '600000';
  }
  if (!process.env.RUNTIME_MAX_TOTAL_LLM_CALLS) {
    process.env.RUNTIME_MAX_TOTAL_LLM_CALLS = '120';
  }
  const userMessage =
    [...(initialState.messages || [])]
      .reverse()
      .find((m) => m.role === 'user')?.content || '';
  const plannerDecision = buildPlannerDecision({
    runId,
    projectId,
    ticketId: ticket,
    message: userMessage,
    requestedPipeline: selectedPipeline || undefined,
    requestedAgents: initialState.customAgents || [],
    requestedSkills: (initialState as any).requestedSkills || [],
  });
  const billingRuntimeDecision = enforceBillingRuntimePolicy({
    billing: {
      plan: (initialState as any)?.billing?.plan,
      entitlement: (initialState as any)?.billing?.entitlement,
      requiredFeatures: (initialState as any)?.billing?.requiredFeatures || [],
    },
    plannerDecision,
    modelRoute,
  });
  if (!billingRuntimeDecision.allowed) {
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      {
        stage: 'billing.runtime_integration',
        rule: 'entitlement_runtime_check',
        reason: billingRuntimeDecision.reason,
      },
    ).catch(() => undefined);
    throw new Error(`[BillingPhase:runtime_integration] blocked ticket=${ticket} reason=${billingRuntimeDecision.reason}`);
  }
  if (billingRuntimeDecision.adjustedModelRoute) {
    process.env.RUNTIME_MODEL_TIER = billingRuntimeDecision.adjustedModelRoute.modelTier;
    process.env.RUNTIME_MODEL_NAME = billingRuntimeDecision.adjustedModelRoute.model;
  }
  const adaptiveRoute = await resolveAdaptivePipelineRoute({
    enforcedPipeline,
    selectedPipeline,
    plannerPipeline: plannerDecision.pipeline,
    message: userMessage,
    workspacePath,
  });
  const pipeline = adaptiveRoute.pipeline;
  logGovernance({
    rule: 'adaptive_pipeline_router',
    status: 'pass',
    action: 'log',
    ticket,
    runId,
    chainId,
    detail: `pipeline=${pipeline};reason=${adaptiveRoute.reason}`,
  });

  if (!hasStrictTicketContext(ticket)) {
    logGovernance({
      rule: 'ticket_context_required',
      status: 'fail',
      action: 'block',
      ticket,
      runId,
      chainId,
      detail: `invalid_ticket_context:${ticket}`,
    });
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      { stage: 'governance.before_run', rule: 'ticket_context_required', reason: 'invalid_or_missing_ticket_context' },
    ).catch(() => undefined);
    throw new Error(`[GovernancePhase:before_run] blocked ticket=${ticket} reason=ticket_context_required`);
  }

  // Sprint 5.5 — Identify if pipeline involves mutating actions (ENF-001 logic)
  const mutatingPipelines = ['new-feature', 'bug-fix', 'hotfix', 'refactor', 'strategy-tuning', 'release', 'rollback-incident'];
  const hasMutatingAction = mutatingPipelines.includes(pipeline);

  const executionPlan = {
    runId,
    projectId,
    ticketId: ticket,
    pipeline,
    agents: plannerDecision.agents,
    skills: plannerDecision.skills,
    stages: plannerDecision.stages,
    source: plannerDecision.source,
  };
  const agentScoreRows = collectAgentPerformanceScores({
    workspacePath,
    projectId,
    agentSlugs: executionPlan.agents,
  });
  executionPlan.agents = applyPerformanceFeedbackOrder(executionPlan.agents, agentScoreRows);
  logGovernance({
    rule: 'performance_score_feedback',
    status: 'pass',
    action: 'log',
    ticket,
    runId,
    chainId,
    detail: `agents_ordered=${executionPlan.agents.join(',')};scores=${JSON.stringify(agentScoreRows)}`,
  });
  const enforcedSkills = Array.isArray((initialState as any).enforcement?.skills)
    ? ((initialState as any).enforcement.skills as string[]).map((s) => String(s || '').trim()).filter(Boolean)
    : [];

  if (enforcedPipeline && executionPlan.pipeline !== enforcedPipeline) {
    logGovernance({
      rule: 'required_pipeline_usage',
      status: 'fail',
      action: 'block',
      ticket,
      runId,
      chainId,
      detail: `enforced_pipeline_mismatch:expected=${enforcedPipeline};actual=${executionPlan.pipeline}`,
    });
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      { stage: 'compliance.before_execution', rule: 'required_pipeline_usage', reason: 'enforced_pipeline_mismatch' },
    ).catch(() => undefined);
    throw new Error(`[CompliancePhase:before_execution] blocked ticket=${ticket} reason=enforced_pipeline_mismatch`);
  }

  if (enforcedSkills.length > 0) {
    const actualSkills = new Set((executionPlan.skills || []).map((s) => String(s || '').trim()));
    const missingSkills = enforcedSkills.filter((s) => !actualSkills.has(s));
    if (missingSkills.length > 0) {
      logGovernance({
        rule: 'required_agent_usage',
        status: 'fail',
        action: 'block',
        ticket,
        runId,
        chainId,
        detail: `enforced_skills_missing:${missingSkills.join(',')}`,
      });
      await emitGuardBlockEvent(
        { runId, projectId, chainId },
        { stage: 'compliance.before_execution', rule: 'required_agent_usage', reason: `enforced_skills_missing:${missingSkills.join(',')}` },
      ).catch(() => undefined);
      throw new Error(`[CompliancePhase:before_execution] blocked ticket=${ticket} reason=enforced_skills_missing`);
    }
  }

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
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      { stage: 'compliance.before_execution', rule: 'plan_required', reason: 'plan_missing_or_incomplete' },
    ).catch(() => undefined);
    throw new Error(`[CompliancePhase:before_execution] blocked ticket=${ticket} reason=plan_required`);
  }

  const beforeExecution = await runGovernancePhase('BEFORE_RUN', {
    runId,
    ticketId: ticket,
    chainId,
    projectId,
    workspacePath,
    pipelineId: pipeline,
    hasMutatingAction,
  });
  if (beforeExecution.blocked) {
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      { stage: 'governance.before_execution', action: beforeExecution.action, entries: beforeExecution.entries },
    ).catch(() => undefined);
    throw new Error(
      `[GovernancePhase:before_execution] blocked ticket=${ticket} action=${beforeExecution.action}`,
    );
  }

  // 1. ENF-001 — Git Preflight Hard Gate
  // This will throw if it's a mutating action without a valid preflight token.
  const { enforcePreflightGate } = await import('@system/governance');
  enforcePreflightGate({
    ticket,
    hasMutatingAction,
    workspacePath: initialState.workspacePath // Pass workspace if needed for token resolution
  } as any);

  // Dedicated multiple agents execution engine.
  const preExecutionQuota = evaluatePreExecutionQuota({
    quota: (initialState as any)?.billing?.quota,
    currentUsage: Number((initialState as any)?.billing?.currentUsage || 0),
    requestedUsage: Number((initialState as any)?.billing?.requestedUsage || 0),
    burstAllowance: Number((initialState as any)?.billing?.burstAllowance || 0),
  });
  if (!preExecutionQuota.allowed) {
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      {
        stage: 'billing.pre_execution',
        rule: 'quota_check_before_run',
        reason: preExecutionQuota.reason || 'quota_block',
        projectedUsage: preExecutionQuota.projectedUsage,
        limit: preExecutionQuota.limit,
      },
    ).catch(() => undefined);
    throw new Error(preExecutionQuota.message || `[BillingPhase:pre_execution] blocked ticket=${ticket} reason=quota_block`);
  }

  await emitEvent({
    type: 'run.started',
    runId,
    projectId,
    chainId,
    actor: { type: 'system', id: 'runtime-router' },
    payload: { modeRequested, pipeline, planner: plannerDecision },
  }).catch(() => undefined);
  let degradedByTimeout = false;
  const runtimeExecutionTimeoutMs = Math.max(10000, Number(process.env.RUNTIME_ROUTER_EXEC_TIMEOUT_MS || 90000));
  const finalState = await withExecutionTimeout({
    task:
      modeRequested === 'linear'
        ? executeUnifiedSwarmRun({ ...initialState, selected_pipeline: pipeline })
        : executeMultipleAgentsRun({ ...initialState, selected_pipeline: pipeline }),
    timeoutMs: runtimeExecutionTimeoutMs,
    timeoutError: new Error(`runtime_router_execution_timeout:${runtimeExecutionTimeoutMs}`),
  }).catch(async (error: any) => {
    const reason = String(error?.message || 'runtime_execution_timeout');
    degradedByTimeout = reason.includes('runtime_router_execution_timeout');
    if (!degradedByTimeout) throw error;
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      {
        stage: 'runtime.execution_timeout',
        reason,
      },
    ).catch(() => undefined);
    return {
      ...(initialState as any),
      runId,
      threadId: chainId,
      projectId,
      selected_pipeline: pipeline,
      status: 'pipeline_completed',
      messages: [
        ...(initialState.messages || []),
        {
          role: 'assistant',
          content:
            'Execution reached runtime timeout boundary. Returned degraded completion to keep chat responsive; follow-up remediation required.',
        },
      ],
      artifactLogs: [
        ...((initialState as any).artifactLogs || []),
        `[runtime-timebox] degraded_completion reason=${reason}`,
      ],
    };
  });

  if (degradedByTimeout) {
    return {
      finalState,
      modeRequested,
      modeApplied: modeRequested,
      engine: modeRequested === 'linear' ? 'pilot-unified-graph' : 'pilot-multiple-agents-runtime',
    };
  }

  await runGovernancePhase('AFTER_STEP', {
    runId,
    ticketId: ticket,
    chainId,
    projectId,
    workspacePath,
    pipelineId: pipeline,
    hasMutatingAction,
  });
  await runGovernancePhase('AFTER_RUN', {
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
    defaultPipeline: pipeline,
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
  const budget = enforceBudgetConstraints(cost, workspacePath);
  if (budget.softExceeded) {
    process.env.RUNTIME_ROUTING_POLICY_MODE = 'cost_saver';
    process.env.RUNTIME_GOVERNANCE_SIGNAL = 'constrained';
    process.env.RUNTIME_QUALITY_DEGRADATION = 'budget_constrained';
    logGovernance({
      rule: 'budget_constraints_engine',
      status: budget.allowed ? 'pass' : 'fail',
      action: budget.allowed ? 'warn' : 'block',
      ticket,
      runId,
      chainId,
      detail: `reason=${budget.reason};totalCostUsd=${Number(cost.monetary.totalCostUsd || 0).toFixed(6)};soft=${budget.softThresholdUsd.toFixed(6)};hard=${budget.hardThresholdUsd.toFixed(6)}`,
    });
  }
  if (!budget.allowed) {
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      {
        stage: 'budget.hard_limit',
        totalCostUsd: Number(cost.monetary.totalCostUsd || 0),
        softThresholdUsd: budget.softThresholdUsd,
        hardThresholdUsd: budget.hardThresholdUsd,
      },
    ).catch(() => undefined);
    throw new Error(
      `[BudgetPhase:hard_limit] blocked ticket=${ticket} run=${runId} totalCostUsd=${Number(cost.monetary.totalCostUsd || 0).toFixed(6)} threshold=${budget.hardThresholdUsd.toFixed(6)}`,
    );
  }
  if (!budget.softExceeded) {
    process.env.RUNTIME_QUALITY_DEGRADATION = 'none';
  }
  const signals = collectLearningSignals(workspacePath, runId, projectId);
  const adaptivePolicy = enforceBoundedAdaptation(
    null,
    decideAdaptivePolicy({
      ...signals,
      tokens: cost.tokens,
      retries: cost.retries,
      loops: cost.loops,
    }),
  );
  process.env.RUNTIME_MAX_RETRIES_PER_STEP = String(adaptivePolicy.retryLimit);
  process.env.GOVERNANCE_SMART_SKIP_IMPROVEMENT_LOOP = adaptivePolicy.enableImprovementLoop ? 'false' : 'true';
  const adaptiveLogPath = writeAdaptiveLog(workspacePath, {
    runId,
    projectId,
    route: modelRoute,
    policy: adaptivePolicy,
    signals: { ...signals, tokens: cost.tokens, retries: cost.retries, loops: cost.loops },
  });
  logGovernance({
    rule: 'adaptive_policy_engine',
    status: 'pass',
    action: 'log',
    ticket,
    runId,
    chainId,
    detail: `retryLimit=${adaptivePolicy.retryLimit};improvementLoop=${adaptivePolicy.enableImprovementLoop};preferredTier=${adaptivePolicy.preferredTier};ledger=${adaptiveLogPath}`,
  });
  const rawSignals = generateImprovementSignals({ workspacePath, runId, projectId });
  const aggregatedSignals = aggregateSignals(rawSignals);
  const ticketDrafts = buildImprovementTicketDrafts(aggregatedSignals);
  const improvementArtifacts = writeImprovementArtifacts({
    workspacePath,
    runId,
    signals: aggregatedSignals,
    tickets: ticketDrafts,
  });
  const templateUpdateProposal = writeTemplateUpdateProposal({
    workspacePath,
    runId,
    sourceArtifacts: improvementArtifacts,
    targetRelativePath: 'generated/templates/process/contracts/auditability-policy.md',
    summary: 'Governed improvement proposal generated from latest runtime signals.',
  });
  const queues = queueIsolationKeys(projectId);
  const enqueuedImprovementId = await enqueueImprovementJob({
    runId,
    projectId,
    chainId,
    workspacePath,
    signalsPath: improvementArtifacts.signalsPath,
    ticketsPath: improvementArtifacts.ticketsPath,
    proposalPath: templateUpdateProposal.proposalPath,
  });
  logGovernance({
    rule: 'improvement_signal_generator',
    status: 'pass',
    action: 'log',
    ticket,
    runId,
    chainId,
    detail: `signals=${aggregatedSignals.length};tickets=${ticketDrafts.length};signalsPath=${improvementArtifacts.signalsPath};ticketsPath=${improvementArtifacts.ticketsPath};proposalPath=${templateUpdateProposal.proposalPath}`,
  });
  logGovernance({
    rule: 'async_execution_isolation',
    status: enqueuedImprovementId ? 'pass' : 'skip',
    action: 'log',
    ticket,
    runId,
    chainId,
    detail: `runtimeQueue=${queues.runtimeQueue};improvementQueue=${queues.improvementQueue};jobId=${enqueuedImprovementId || 'none'}`,
  });
  const learningKpi = evaluateLearningEffectKpi({
    signals: aggregatedSignals,
    tickets: ticketDrafts,
    complianceFailures: signals.complianceFailures,
    retries: cost.retries,
  });
  logGovernance({
    rule: 'learning_effect_kpi_gate',
    status: learningKpi.pass ? 'pass' : 'fail',
    action: learningKpi.pass ? 'allow' : 'warn',
    ticket,
    runId,
    chainId,
    detail: `score=${learningKpi.score.toFixed(2)};${learningKpi.reason}`,
  });
  const learningTrend = evaluateLearningTrendKpi({
    workspacePath,
    projectId,
    runId,
  });
  logGovernance({
    rule: 'learning_effect_trend_gate',
    status: learningTrend.pass ? 'pass' : 'fail',
    action: learningTrend.pass ? 'allow' : 'warn',
    ticket,
    runId,
    chainId,
    detail: `score=${learningTrend.score.toFixed(2)};${learningTrend.reason};report=${learningTrend.reportPath};alarm=${learningTrend.regressionAlarmPath || 'none'}`,
  });
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
    await emitGuardBlockEvent(
      { runId, projectId, chainId },
      {
        stage: 'cost.hard_limit',
        tokens: cost.tokens,
        threshold: costLimit.threshold,
        retries: cost.retries,
        loops: cost.loops,
      },
    ).catch(() => undefined);
    throw new Error(
      `[CostPhase:hard_limit] blocked ticket=${ticket} run=${runId} tokens=${cost.tokens} threshold=${costLimit.threshold}`,
    );
  }

  // 2. ENF-006 — Pipeline Usage Soft Gate (log classification result from router node)
  // This is best logged inside routerNode in the unified swarm graph,
  // but we can add a high-level log here as a secondary check.

  return {
    finalState,
    modeRequested,
    modeApplied: modeRequested,
    engine: modeRequested === 'linear' ? 'pilot-unified-graph' : 'pilot-multiple-agents-runtime',
  };
}
export async function resumeRuntimeRun(threadId: string, decision: any): Promise<RuntimeExecutionResult> {
  const finalState = await resumeUnifiedSwarmRun(threadId, decision);
  return {
    finalState,
    modeRequested: 'linear',
    modeApplied: 'linear',
    engine: 'pilot-unified-graph',
  };
}
