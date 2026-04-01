/**
 * Sprint 5.5 — Enforcement MVP (Executable Governance)
 * Public API for all governance gate modules.
 */

// ENF-004 — Governance Logging (foundational)
export {
  logGovernance,
  readGovernanceLogs,
  type GovernanceLogEntry,
  type GovernanceStatus,
  type GovernanceAction,
} from './GovernanceLogger';

// ENF-001 — Git Preflight Hard Gate
export {
  enforcePreflightGate,
  checkPreflightGate,
  GovernancePreflightError,
  type PreflightCheckInput,
  type PreflightCheckResult,
} from './PreflightEnforcer';

// ENF-002 — Postflight Hard Gate
export {
  enforcePostflightGate,
  checkPostflightEvidence,
  writeTestReportStub,
  GovernancePostflightError,
  type PostflightCheckInput,
  type PostflightCheckResult,
} from './PostflightEnforcer';

// ENF-003 — Improvement Loop Soft Gate
export { logImprovementLoopGate, type ImprovementCheckInput } from './ImprovementLoopEnforcer';

// ENF-005 — Agent Participation Soft Gate
export { logParticipationGate, type ParticipationCheckInput } from './AgentParticipationEnforcer';

// ENF-006 — Pipeline Usage Soft Gate
export { logPipelineUsageGate, type PipelineUsageInput } from './PipelineUsageEnforcer';

// ENF-007 — Cost Tracking Light
export { logCostTrackerGate, type CostTrackerInput } from './CostTrackerEnforcer';
