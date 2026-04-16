import { GovernanceEngineContext, GovernanceRule, GovernanceRuleEvaluation } from './GovernanceEngineTypes';
export declare function runHybridVerifier(rule: GovernanceRule, ctx: GovernanceEngineContext, deterministicReason: string): Promise<GovernanceRuleEvaluation>;
