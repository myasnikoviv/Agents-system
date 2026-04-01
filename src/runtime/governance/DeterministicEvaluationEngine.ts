import { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';
import { checkImprovementArtifact, checkPreflightToken, checkTestReport } from './ArtifactEvidenceChecker';
import { collectEventEvidence } from './EventEvidenceCollector';
import { readTelemetry } from './TelemetryReader';

type DeterministicHandler = (
  rule: GovernanceRule,
  ctx: GovernanceEngineContext,
  workspacePath: string,
) => Promise<GovernanceRuleEvaluation>;

const DETERMINISTIC_HANDLERS: Record<string, DeterministicHandler> = {
  preflight_token: async (rule, ctx, workspacePath) => {
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
  },
  postflight_report: async (rule, ctx, workspacePath) => {
    const r = checkTestReport(workspacePath, ctx.ticketId);
    return {
      ruleId: rule.id,
      verdict: r.found ? 'pass' : 'fail',
      reason: r.found ? 'test_report_present' : 'test_report_missing',
      evidenceSummary: r.matchedPath || 'none',
    };
  },
  improvement_artifact: async (rule, ctx, workspacePath) => {
    if (String(process.env.GOVERNANCE_SMART_SKIP_IMPROVEMENT_LOOP || '').toLowerCase() === 'true') {
      return {
        ruleId: rule.id,
        verdict: 'pass',
        reason: 'improvement_loop_smart_skipped_low_risk',
        evidenceSummary: 'smart_skip_enabled',
      };
    }
    const r = checkImprovementArtifact(workspacePath, ctx.ticketId);
    return {
      ruleId: rule.id,
      verdict: r.found ? 'pass' : 'fail',
      reason: r.found ? 'improvement_artifact_present' : 'improvement_artifact_missing',
      evidenceSummary: r.matchedPath || 'none',
    };
  },
  agent_usage_events: async (rule, ctx) => {
    const e = await collectEventEvidence(ctx.runId);
    return {
      ruleId: rule.id,
      verdict: e.agentStarted > 0 ? 'pass' : 'fail',
      reason: e.agentStarted > 0 ? 'agents_detected' : 'no_agent_started_events',
      evidenceSummary: `agent.started=${e.agentStarted}`,
    };
  },
  pipeline_usage_events: async (rule, ctx) => {
    const e = await collectEventEvidence(ctx.runId);
    return {
      ruleId: rule.id,
      verdict: e.stageStarted > 0 ? 'pass' : 'fail',
      reason: e.stageStarted > 0 ? 'stages_detected' : 'no_stage_started_events',
      evidenceSummary: `stage.started=${e.stageStarted}`,
    };
  },
  cost_guard_tokens: async (rule, ctx, workspacePath) => {
    const t = readTelemetry(workspacePath, ctx.runId);
    const threshold = Number(process.env.GOVERNANCE_COST_GUARD_MAX_TOKENS || '120000');
    const pass = t.totalTokens <= threshold;
    return {
      ruleId: rule.id,
      verdict: pass ? 'pass' : 'fail',
      reason: pass ? 'under_cost_threshold' : 'cost_threshold_exceeded',
      evidenceSummary: `tokens=${t.totalTokens},threshold=${threshold},entries=${t.entries}`,
    };
  },
};

export async function evaluateDeterministic(
  rule: GovernanceRule,
  ctx: GovernanceEngineContext,
): Promise<GovernanceRuleEvaluation> {
  const workspacePath = ctx.workspacePath || process.cwd();
  const checkKey = String(rule.deterministicCheck || '');
  const handler = DETERMINISTIC_HANDLERS[checkKey];
  if (handler) {
    return handler(rule, ctx, workspacePath);
  }

  return { ruleId: rule.id, verdict: 'unknown', reason: 'unsupported_rule', evidenceSummary: 'no deterministic evaluator' };
}
