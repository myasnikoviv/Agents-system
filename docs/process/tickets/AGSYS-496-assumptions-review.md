# Assumptions Review — AGSYS-496

- Ticket: AGSYS-496
- Pipeline: sprint-integration
- Stage: assumptions-review
- Owner: PM Orchestrator
- Date: 2026-04-08

## Assumptions
1. Existing chat-flow report (`report-1775652578081.json`) is representative for runtime behavior in both `linear` and `multiple_agents`.
2. Ledger events are authoritative runtime evidence for handoffs and execution traces.
3. Missing `worker.*` / `task.*` events means real worker instrumentation path is not active in current backend runtime.
4. Temporary absence of `/api/cockpit/swarm/*` in active process is a runtime drift/blocker, not proof of feature absence in source code.

## Validation Decision
- Assumptions 1-2: accepted (evidence exists).
- Assumptions 3-4: accepted as current blocker hypothesis; requires remediation ticket(s).
