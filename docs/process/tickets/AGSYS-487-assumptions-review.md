# AGSYS-487 Assumptions Review

- Ticket: AGSYS-487
- Reviewer: PM Orchestrator
- Approval: user implicit go-ahead (`давай`), 2026-04-08

## Assumptions
1. `AGENTS.md` signature change is sufficient trigger for refreshing project catalog cache.
2. Runtime graph can continue using registries if registries are activated from project snapshot before `/api/chat` run.
3. Cockpit agent registry should read snapshot data directly, not global mutable registry state.

## Risks
- Concurrent runs across different projects may still require deeper registry isolation in later tasks (S19-6/S19-7).

## Decision
Proceed with snapshot cache + activation approach as baseline for Sprint 19 task S19-2.
