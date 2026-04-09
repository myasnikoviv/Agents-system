/**
 * Public API for all governance gate modules.
 */

export {
  enforcePreflightGate,
  checkPreflightGate,
  GovernancePreflightError,
  type PreflightCheckInput,
  type PreflightCheckResult,
} from './PreflightEnforcer';

export {
  checkPostflightEvidence,
  enforcePostflightGate,
  writeTestReportStub,
  GovernancePostflightError,
  type PostflightCheckInput,
  type PostflightCheckResult,
} from './PostflightEnforcer';

export {
  logGovernance,
  readGovernanceLogs,
  type GovernanceAction,
  type GovernanceLogEntry,
  type GovernanceStatus,
} from './GovernanceLogger';

export { logImprovementLoopGate, type ImprovementCheckInput } from './ImprovementLoopEnforcer';
export { logParticipationGate, type ParticipationCheckInput } from './AgentParticipationEnforcer';
export { logPipelineUsageGate, type PipelineUsageInput } from './PipelineUsageEnforcer';
export { logCostTrackerGate, type CostTrackerInput } from './CostTrackerEnforcer';

export { runGovernancePhase } from './GovernanceEngineCore';
export type { GovernancePhase, GovernanceEngineContext, GovernancePhaseResult } from './GovernanceEngineTypes';
export { loadGovernanceRules, getRuleById, GovernanceRegistryError } from './RuleRegistry';
export { loadGovernanceLoops, getGovernanceLoopById, GovernanceLoopRegistryError } from './LoopRegistry';
export { resolveEnabledRules } from './ProjectPolicyBinding';
export { listDeterministicEvaluators, registerDeterministicEvaluator } from './DeterministicEvaluationEngine';
export { listEvaluators, registerEvaluator, resolveEvaluator } from './EvaluatorRegistry';
