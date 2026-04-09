# Pipeline State — AGSYS-494

- Pipeline: unified-task-intake
- Stage: implementation
- Next: Documentation Owner -> PM acceptance
- Status: In Progress
- Updated: 2026-04-08

## Progress Log
1. Added utilization counters to worker record (invocation/cold-start/duration/idle).
2. Hooked counters to lifecycle transitions (active/standby).
3. Added `utilizationSnapshot()` API in worker manager.
4. Added backend endpoint `/api/cockpit/swarm/utilization` with summary aggregates.
5. Added tests proving metrics collection behavior.
