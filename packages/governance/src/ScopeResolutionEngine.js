"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveScopedRules = resolveScopedRules;
function precedence(level) {
    if (level === 'session')
        return 3;
    if (level === 'project')
        return 2;
    return 1;
}
function isRuleInScope(rule, ctx) {
    const scope = rule.scope || { level: 'global' };
    if (scope.level === 'global')
        return true;
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
function resolveScopedRules(input) {
    const scoped = input.rules.filter((rule) => isRuleInScope(rule, input.context));
    const dedup = new Map();
    // Sort by precedence so highest overlaps lowest
    const sorted = [...scoped].sort((a, b) => precedence(a.scope?.level || 'global') - precedence(b.scope?.level || 'global'));
    for (const rule of sorted) {
        const level = rule.scope?.level || 'global';
        let effectiveRule = { ...rule };
        // Apply project-level overrides from policy binding if applicable
        if (level === 'global' && input.projectOverrides?.[rule.id]) {
            const override = input.projectOverrides[rule.id];
            effectiveRule = {
                ...effectiveRule,
                evidence: override.evidence || effectiveRule.evidence,
                thresholds: {
                    ...(effectiveRule.thresholds || {}),
                    ...(override.thresholds || {}),
                },
            };
        }
        dedup.set(rule.id, effectiveRule);
    }
    // Final pass to ensure session rules (higher precedence) fully replace global/project entries
    return Array.from(dedup.values());
}
