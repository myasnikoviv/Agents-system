import type { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';
export type DeterministicHandler = (rule: GovernanceRule, ctx: GovernanceEngineContext, workspacePath: string) => Promise<GovernanceRuleEvaluation>;
export interface GovernanceEvaluatorContract {
    evaluatorType: string;
    evaluate: DeterministicHandler;
    source?: 'builtin' | 'plugin';
    allowOverrideBuiltin?: boolean;
}
export declare function registerEvaluator(input: GovernanceEvaluatorContract): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
export declare function resolveEvaluator(evaluatorType: string): DeterministicHandler | undefined;
export declare function listEvaluators(): Array<{
    evaluatorType: string;
    isBuiltin: boolean;
}>;
export declare function resetEvaluatorRegistry(): void;
