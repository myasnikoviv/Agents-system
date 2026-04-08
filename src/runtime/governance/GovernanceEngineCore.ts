import { logGovernance } from './GovernanceLogger';
import { evaluateDeterministic } from './DeterministicEvaluationEngine';
import { runHybridVerifier } from './LlmVerifierWrapper';
import { isBypassAllowed, isGlobalGovernanceDisabled } from './EmergencyBrake';
import { resolveEnabledRules } from './ProjectPolicyBinding';
import { loadGovernanceRules } from './RuleRegistry';
import { resolveManualOverride } from './ManualOverrideRegistry';
import { GovernanceEngineContext, GovernancePhase, GovernancePhaseResult } from './GovernanceEngineTypes';
import fs from 'fs';
import path from 'path';
import { emitGuardEscalationEvent } from '../events/EventBus';
import { resolveRuntimePath } from '../RuntimePathResolver';

const SOFT_GATE_MAX_RETRIES = 1;
const SOFT_GATE_MAX_WARNINGS = 1;

const softRetryCounter = new Map<string, number>();
const softWarnCounter = new Map<string, number>();

interface GovernanceExecutionPolicy {
  strictDeterministic?: boolean;
  llmFallbackEnabled?: boolean;
}

function softRetryKey(ctx: GovernanceEngineContext, ruleId: string) {
  return `${ctx.runId}:${ctx.ticketId}:${ruleId}`;
}

function writeEscalationArtifact(ctx: GovernanceEngineContext, ruleId: string, reason: string): string | null {
  const workspacePath = ctx.workspacePath || process.cwd();
  const dir = resolveRuntimePath(workspacePath, 'processBlockersDir');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${ctx.ticketId}-governance-escalation.md`);
    const body = [
      `# Governance Escalation: ${ctx.ticketId}`,
      '',
      `- rule: ${ruleId}`,
      `- runId: ${ctx.runId}`,
      `- chainId: ${ctx.chainId}`,
      `- reason: ${reason}`,
      `- timestamp: ${new Date().toISOString()}`,
      '',
      'Escalated after retry/warn budget exceeded.',
      '',
    ].join('\n');
    fs.writeFileSync(file, body, 'utf-8');
    return file;
  } catch {
    return null;
  }
}

function loadExecutionPolicy(workspacePath?: string): GovernanceExecutionPolicy {
  const root = workspacePath || process.cwd();
  const filePath = resolveRuntimePath(root, 'governanceExecutionPolicyFile');
  if (!fs.existsSync(filePath)) {
    return { strictDeterministic: true, llmFallbackEnabled: false };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GovernanceExecutionPolicy;
    return {
      strictDeterministic: parsed.strictDeterministic !== false,
      llmFallbackEnabled: parsed.llmFallbackEnabled === true,
    };
  } catch {
    return { strictDeterministic: true, llmFallbackEnabled: false };
  }
}

function normalizePhaseAlias(phase: GovernancePhase): 'BEFORE_RUN' | 'AFTER_STEP' | 'AFTER_RUN' {
  if (phase === 'BEFORE_RUN' || phase === 'AFTER_STEP' || phase === 'AFTER_RUN') return phase;
  if (phase === 'pre_execution' || phase === 'before_execution') return 'BEFORE_RUN';
  if (phase === 'post_execution' || phase === 'after_execution') return 'AFTER_STEP';
  if (phase === 'pre_task_close' || phase === 'before_task_close') return 'AFTER_RUN';
  return 'AFTER_RUN';
}

export async function runGovernancePhase(
  phase: GovernancePhase,
  ctx: GovernanceEngineContext,
): Promise<GovernancePhaseResult> {
  const normalizedPhase = normalizePhaseAlias(phase);
  if (isGlobalGovernanceDisabled() || isBypassAllowed(ctx)) {
    return { phase: normalizedPhase, blocked: false, action: 'skip', entries: [], retrySuggested: false };
  }

  const registryRules = loadGovernanceRules(ctx.workspacePath);
  const executionPolicy = loadExecutionPolicy(ctx.workspacePath);
  const enabled = resolveEnabledRules(ctx.projectId || 'default', ctx.workspacePath);
  const rules = registryRules.filter((r) => enabled.has(r.id) && r.triggerPhases.includes(normalizedPhase));
  const entries = [] as GovernancePhaseResult['entries'];

  let blocked = false;
  let action: GovernancePhaseResult['action'] = 'allow';
  let retrySuggested = false;

  for (const rule of rules) {
    const manualOverride = resolveManualOverride({
      context: ctx,
      phase: normalizedPhase,
      ruleId: rule.id,
    });
    if (manualOverride) {
      const result = {
        ruleId: rule.id,
        verdict: 'pass' as const,
        reason: `manual_override:${manualOverride.id}`,
        evidenceSummary: `actor=${manualOverride.actorId};scope=${manualOverride.scope};reason=${manualOverride.reason}`,
      };
      entries.push(result);
      logGovernance({
        rule: rule.id,
        status: 'pass',
        action: 'allow',
        ticket: ctx.ticketId,
        runId: ctx.runId,
        chainId: ctx.chainId,
        detail: `${normalizedPhase}:manual_override;overrideId=${manualOverride.id};actor=${manualOverride.actorId};reason=${manualOverride.reason}`,
      });
      continue;
    }

    let result = await evaluateDeterministic(rule, ctx);

    const allowLlmFallback = executionPolicy.strictDeterministic ? false : executionPolicy.llmFallbackEnabled === true;
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
          const warnCount = softWarnCounter.get(key) || 0;
          if (warnCount < SOFT_GATE_MAX_WARNINGS) {
            softWarnCounter.set(key, warnCount + 1);
            action = 'warn';
          } else {
            action = 'escalate';
            const artifactPath = writeEscalationArtifact(ctx, rule.id, result.reason);
            await emitGuardEscalationEvent(
              { runId: ctx.runId, projectId: ctx.projectId, chainId: ctx.chainId },
              {
                ticket: ctx.ticketId,
                rule: rule.id,
                reason: result.reason,
                artifactPath: artifactPath || 'none',
              },
            ).catch(() => undefined);
          }
        }
      } else if (!blocked) {
        action = 'warn';
      }
    }

    logGovernance({
      rule: rule.id,
      status: result.verdict === 'pass' ? 'pass' : result.verdict === 'fail' ? 'fail' : 'skip',
      action:
        action === 'block'
          ? 'block'
          : action === 'retry'
            ? 'retry'
            : action === 'warn'
              ? 'warn'
              : action === 'escalate'
                ? 'escalate'
                : 'allow',
      ticket: ctx.ticketId,
      runId: ctx.runId,
      chainId: ctx.chainId,
      detail: `${normalizedPhase}:${result.reason};evidence=${result.evidenceSummary}`,
    });
  }

  return { phase: normalizedPhase, blocked, action, entries, retrySuggested };
}
