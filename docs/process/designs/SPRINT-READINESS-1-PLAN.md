# Readiness Sprint 1 - Execution Plan

Cycle: `Readiness Sprint 1 (2026-03-13..2026-03-26)`
Project: `TRADE`
Owner: `pm@trade-bot.local`
Status: `In Progress`

## Goal
Bring the project to controlled, repeatable delivery mode with:
- stable local ticketing (Plane),
- defined cross-agent workflow,
- enforceable architecture/test/review gates,
- operational baseline and incident readiness.

## Parallel Workstreams

### Stream A - Delivery Core (P0)
- `KICKOFF-003` - integration of kickoff findings into execution.
- `PM-801` - ticketing governance on local Plane.
- `PM-802` - sprint orchestration and dependency control.
- `DEV-811` - local Plane deployment hardening.
- `ARCH-101` - test topology consolidation.
- `QA-201` - regression matrix for Strategy #2 chain.
- `RUN-401` - run manifest standard.
- `REV-301` - invariant review checklist.
- `DOC-701` - canonical docs index.
- `GIT-601` - commit scope enforcement guide.
- `OPS-901` - infrastructure baseline & inventory.

### Stream B - Guardrails (Wave 2)
Start after Stream A artifacts exist and are reviewed:
- `ARCH-104`, `QA-202`, `QA-203`, `REV-302`, `REV-303`, `RUN-403`, `DOC-703`, `TRD-503`, `OPS-903`, `OPS-904`.

## Dependency Rules
- `QA-201` depends on `ARCH-101` (test topology + fixture ownership).
- `RUN-401` depends on `QA-201` (report fields must map to matrix).
- `REV-301` consumes outputs from `ARCH-101`, `QA-201`, `RUN-401`.
- `DOC-701` updates only after first-pass acceptance of above artifacts.
- `OPS-901` feeds `OPS-902/903/904`.

## WIP Policy
- Keep each role at max `1` active delivery ticket unless explicitly blocked.
- PM may keep `2` active tickets (`PM-801`, `PM-802`) for coordination.
- New high-priority ticket enters `In Progress` only with explicit swap-out.

## Definition of Done (Sprint)
- All Stream A tickets are in `Done`.
- Wave 2 tickets have accepted design notes and ordered implementation queue.
- Plane cycle reflects real owner/state for every active ticket.
- No critical blockers in local infra (`proxy`, `api`, `web`, `db`, `redis`, `mq`, `minio` healthy).

## Daily Cadence
- PM sync (start of day): blockers, owner changes, re-prioritization.
- Midday check: validate progress evidence in ticket comments/artifacts.
- End-of-day: update cycle burndown state and next-day handoff list.
