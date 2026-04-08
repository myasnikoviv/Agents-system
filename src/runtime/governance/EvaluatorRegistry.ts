import type { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';

export type DeterministicHandler = (
  rule: GovernanceRule,
  ctx: GovernanceEngineContext,
  workspacePath: string,
) => Promise<GovernanceRuleEvaluation>;

export interface GovernanceEvaluatorContract {
  evaluatorType: string;
  evaluate: DeterministicHandler;
  source?: 'builtin' | 'plugin';
  allowOverrideBuiltin?: boolean;
}

const evaluatorHandlers = new Map<string, DeterministicHandler>();
const builtinEvaluatorTypes = new Set<string>();

function normalizeType(input: string): string {
  return String(input || '').trim();
}

export function registerEvaluator(input: GovernanceEvaluatorContract): { ok: true } | { ok: false; reason: string } {
  const evaluatorType = normalizeType(input?.evaluatorType || '');
  if (!evaluatorType) return { ok: false, reason: 'evaluator_type_required' };
  if (typeof input.evaluate !== 'function') return { ok: false, reason: 'evaluator_function_required' };

  const isBuiltin = input.source === 'builtin';
  const exists = evaluatorHandlers.has(evaluatorType);
  const isBuiltinProtected = builtinEvaluatorTypes.has(evaluatorType);

  if (exists && isBuiltinProtected && input.allowOverrideBuiltin !== true) {
    return { ok: false, reason: 'builtin_override_blocked' };
  }

  evaluatorHandlers.set(evaluatorType, input.evaluate);
  if (isBuiltin) builtinEvaluatorTypes.add(evaluatorType);
  return { ok: true };
}

export function resolveEvaluator(evaluatorType: string): DeterministicHandler | undefined {
  return evaluatorHandlers.get(normalizeType(evaluatorType));
}

export function listEvaluators(): Array<{ evaluatorType: string; isBuiltin: boolean }> {
  return Array.from(evaluatorHandlers.keys())
    .sort((a, b) => a.localeCompare(b))
    .map((evaluatorType) => ({ evaluatorType, isBuiltin: builtinEvaluatorTypes.has(evaluatorType) }));
}

export function resetEvaluatorRegistry(): void {
  evaluatorHandlers.clear();
  builtinEvaluatorTypes.clear();
}
