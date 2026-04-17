import { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';
import { type GovernanceEvaluatorContract } from './EvaluatorRegistry';
export declare function registerDeterministicEvaluator(input: GovernanceEvaluatorContract): void;
export declare function listDeterministicEvaluators(): Array<{
    evaluatorType: string;
    isBuiltin: boolean;
}>;
export declare function evaluateDeterministic(rule: GovernanceRule, ctx: GovernanceEngineContext): Promise<GovernanceRuleEvaluation>;
