import type { GovernanceEngineContext, GovernanceRule } from './GovernanceEngineTypes';
export declare function resolveScopedRules(input: {
    rules: GovernanceRule[];
    context: GovernanceEngineContext;
    projectOverrides?: Record<string, {
        evidence?: string[];
        thresholds?: Record<string, number>;
    }>;
}): GovernanceRule[];
