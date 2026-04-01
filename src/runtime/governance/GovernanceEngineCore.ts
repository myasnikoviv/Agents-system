import { logGovernance } from './GovernanceLogger';
import { evaluateDeterministic } from './DeterministicEvaluationEngine';
import { runHybridVerifier } from './LlmVerifierWrapper';
import { isBypassAllowed, isGlobalGovernanceDisabled } from './EmergencyBrake';
import { resolveEnabledRules } from './ProjectPolicyBinding';
import { loadGovernanceRules } from './RuleRegistry';
import { GovernanceEngineContext, GovernancePhase, GovernancePhaseResult } from './GovernanceEngineTypes';

const SOFT_GATE_MAX_RETRIES = 1;

const softRetryCounter = new Map<string, number>();

function softRetryKey(ctx: GovernanceEngineContext, ruleId: string) {
  return `${ctx.runId}:${ctx.ticketId}:${ruleId}`;
}

export async function runGovernancePhase(
  phase: GovernancePhase,
  ctx: GovernanceEngineContext,
): Promise<GovernancePhaseResult> {
  if (isGlobalGovernanceDisabled() || isBypassAllowed(ctx)) {
    return { phase, blocked: false, action: 'skip', entries: [], retrySuggested: false };
  }

  const registryRules = loadGovernanceRules(ctx.workspacePath);
  const enabled = resolveEnabledRules(ctx.projectId || 'default', ctx.workspacePath);
  const rules = registryRules.filter((r) => enabled.has(r.id) && r.triggerPhases.includes(phase));
  const entries = [] as GovernancePhaseResult['entries'];

  let blocked = false;
  let action: GovernancePhaseResult['action'] = 'allow';
  let retrySuggested = false;

  for (const rule of rules) {
    let result = await evaluateDeterministic(rule, ctx);

    const allowLlmFallback = String(process.env.GOVERNANCE_ENABLE_LLM_FALLBACK || '').toLowerCase() === 'true';
    if (
      result.verdict === 'unknown' &&
      allowLlmFallback &&
      (rule.evaluationType === 'hybrid' || rule.evaluationType === 'llm')
    ) {
      result = await runHybridVerifier(rule, ctx, result.reason);
    }

    entries.push(result);

    if (result.verdict === 'fail') {
      if (rule.enforcementMode === 'hard') {
        blocked = true;
        action = 'block';
      } else if (rule.enforcementMode === 'soft' && !blocked) {
        const key = softRetryKey(ctx, rule.id);
        const current = softRetryCounter.get(key) || 0;
        if (current < SOFT_GATE_MAX_RETRIES) {
          softRetryCounter.set(key, current + 1);
          retrySuggested = true;
          action = 'retry';
        } else {
          action = 'warn';
        }
      } else if (!blocked) {
        action = 'warn';
      }
    }

    logGovernance({
      rule: rule.id,
      status: result.verdict === 'pass' ? 'pass' : result.verdict === 'fail' ? 'fail' : 'skip',
      action: action === 'block' ? 'block' : action === 'retry' ? 'retry' : action === 'warn' ? 'warn' : 'allow',
      ticket: ctx.ticketId,
      runId: ctx.runId,
      chainId: ctx.chainId,
      detail: `${phase}:${result.reason};evidence=${result.evidenceSummary}`,
    });
  }

  return { phase, blocked, action, entries, retrySuggested };
}
