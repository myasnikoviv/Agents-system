// Canonical unified swarm graph entrypoint used by linear mode and as execution core in multiple_agents runtime wrapper.
// Kept as a separate module name to avoid misleading "quasi-linear-only" semantics.
export {
  executeQuasiLinearRun as executeUnifiedSwarmRun,
  resumeQuasiLinearRun as resumeUnifiedSwarmRun,
  pilotGraph as unifiedSwarmGraph,
  type PilotState,
} from './PilotQuasiLinearGraph';
