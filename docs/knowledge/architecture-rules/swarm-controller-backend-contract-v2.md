# Swarm Controller Backend Contract V2

## Scope
Project-scoped runtime contract used by Cockpit Swarm Controller.

## Row schema
- `projectId`
- `agentSlug`
- `workerId`
- `enabled` (`true/false`)
- `availabilityState` (`hot|cold`)
- `executionState` (`active|standby`)
- `rawLifecycleState` (`cold|starting|hot|active|standby|stopping|failed`)
- `heartbeatFreshness` (`fresh|stale|dead`)
- `heartbeatAgeMs`
- `assignedTask` (`taskId`, optional `stageId`, optional `pipelineId`, `runId`) or `null`
- `memoryNamespace`

## Endpoints
- `GET /api/cockpit/swarm/workers?projectId=...`
- `GET /api/cockpit/swarm/summary?projectId=...`

## Invariants
- Contract is always project-scoped.
- `enabled=false` iff lifecycle state is `failed`.
- `executionState=active` iff lifecycle state is `active`; otherwise `standby`.
- `assignedTask` is present while active and cleared on standby/failed transition.
