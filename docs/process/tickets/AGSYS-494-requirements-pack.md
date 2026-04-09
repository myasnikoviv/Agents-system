# AGSYS-494 Requirements Pack

- Ticket: AGSYS-494
- Sprint: Sprint 19
- Pipeline: unified-task-intake
- Prepared by: PM Orchestrator
- Approved by: user (`давай`), 2026-04-08

## Goal
Collect project/agent utilization telemetry for future hot/cold optimization decisions.

## Scope
- invocation count
- task duration
- cold-start count
- idle time

## Acceptance Criteria
1. Telemetry tracks usage frequency per project/agent.
2. Cold-start and idle metrics are captured.
3. Utilization data is available through backend contract for optimization layer.
4. Telemetry collection does not break execution flow.
