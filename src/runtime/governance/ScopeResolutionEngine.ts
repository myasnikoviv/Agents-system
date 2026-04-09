import type { GovernanceEngineContext, GovernanceRule } from './GovernanceEngineTypes';

function precedence(level: string): number {
  if (level === 'session') return 3;
  if (level === 'project') return 2;
  return 1;
}

function isRuleInScope(rule: GovernanceRule, ctx: GovernanceEngineContext): boolean {
  const scope = rule.scope || { level: 'global' as const };
  if (scope.level === 'global') return true;
  if (scope.level === 'project') {
    return !scope.projectId || scope.projectId === ctx.projectId;
  }
  if (scope.level === 'session') {
    const sameProject = !scope.projectId || scope.projectId === ctx.projectId;
    const sameSession = !scope.sessionId || scope.sessionId === ctx.chainId;
    return sameProject && sameSession;
  }
  return true;
}

export function resolveScopedRules(input: {
  rules: GovernanceRule[];
  context: GovernanceEngineContext;
}): GovernanceRule[] {
  const scoped = input.rules.filter((rule) => isRuleInScope(rule, input.context));
  const dedup = new Map<string, GovernanceRule>();
  for (const rule of scoped) {
    const existing = dedup.get(rule.id);
    if (!existing) {
      dedup.set(rule.id, rule);
      continue;
    }
    const currentScore = precedence(rule.scope?.level || 'global');
    const prevScore = precedence(existing.scope?.level || 'global');
    if (currentScore >= prevScore) {
      dedup.set(rule.id, rule);
    }
  }
  return Array.from(dedup.values());
}
