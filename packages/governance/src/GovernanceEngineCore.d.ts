import { GovernanceEngineContext, GovernancePhase, GovernancePhaseResult } from './GovernanceEngineTypes';
export declare function runGovernancePhase(phase: GovernancePhase, ctx: GovernanceEngineContext): Promise<GovernancePhaseResult>;
