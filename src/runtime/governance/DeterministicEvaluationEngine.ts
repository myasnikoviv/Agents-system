import { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';
import { checkImprovementArtifact, checkPreflightToken, checkTestReport } from './ArtifactEvidenceChecker';
import { collectEventEvidence } from './EventEvidenceCollector';
import { readTelemetry } from './TelemetryReader';

export async function evaluateDeterministic(
  rule: GovernanceRule,
  ctx: GovernanceEngineContext,
): Promise<GovernanceRuleEvaluation> {
  const workspacePath = ctx.workspacePath || process.cwd();

  if (rule.id === 'git_preflight') {
    if (!ctx.hasMutatingAction) {
      return { ruleId: rule.id, verdict: 'pass', reason: 'non_mutating_action', evidenceSummary: 'skip preflight for non-mutation' };
    }
    const r = checkPreflightToken(workspacePath, ctx.ticketId);
    return {
      ruleId: rule.id,
      verdict: r.found ? 'pass' : 'fail',
      reason: r.found ? 'preflight_token_present' : 'preflight_token_missing',
      evidenceSummary: r.matchedPath || 'none',
    };
  }

  if (rule.id === 'postflight_evidence') {
    const r = checkTestReport(workspacePath, ctx.ticketId);
    return {
      ruleId: rule.id,
      verdict: r.found ? 'pass' : 'fail',
      reason: r.found ? 'test_report_present' : 'test_report_missing',
      evidenceSummary: r.matchedPath || 'none',
    };
  }

  if (rule.id === 'improvement_loop') {
    const r = checkImprovementArtifact(workspacePath, ctx.ticketId);
    return {
      ruleId: rule.id,
      verdict: r.found ? 'pass' : 'fail',
      reason: r.found ? 'improvement_artifact_present' : 'improvement_artifact_missing',
      evidenceSummary: r.matchedPath || 'none',
    };
  }

  if (rule.id === 'required_agent_usage') {
    const e = await collectEventEvidence(ctx.runId);
    return {
      ruleId: rule.id,
      verdict: e.agentStarted > 0 ? 'pass' : 'fail',
      reason: e.agentStarted > 0 ? 'agents_detected' : 'no_agent_started_events',
      evidenceSummary: `agent.started=${e.agentStarted}`,
    };
  }

  if (rule.id === 'required_pipeline_usage') {
    const e = await collectEventEvidence(ctx.runId);
    return {
      ruleId: rule.id,
      verdict: e.stageStarted > 0 ? 'pass' : 'fail',
      reason: e.stageStarted > 0 ? 'stages_detected' : 'no_stage_started_events',
      evidenceSummary: `stage.started=${e.stageStarted}`,
    };
  }

  if (rule.id === 'cost_guard_light') {
    const t = readTelemetry(workspacePath, ctx.runId);
    const threshold = Number(process.env.GOVERNANCE_COST_GUARD_MAX_TOKENS || '120000');
    const pass = t.totalTokens <= threshold;
    return {
      ruleId: rule.id,
      verdict: pass ? 'pass' : 'fail',
      reason: pass ? 'under_cost_threshold' : 'cost_threshold_exceeded',
      evidenceSummary: `tokens=${t.totalTokens},threshold=${threshold},entries=${t.entries}`,
    };
  }

  return { ruleId: rule.id, verdict: 'unknown', reason: 'unsupported_rule', evidenceSummary: 'no deterministic evaluator' };
}
