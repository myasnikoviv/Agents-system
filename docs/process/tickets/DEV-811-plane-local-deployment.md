# DEV-811: Implement Plane Local Deployment + Initial Ticket Import

## Parent
- PM-801: `docs/process/tickets/PM-801-plane-local-ticketing.md`

## Type
Implementation

## Priority
P0

## Owner
- Primary: Developer
- Support: Git Flow Manager, Documentation Owner

## Objective
Implement local Plane setup and make it operational for daily ticket workflow in `trade_bot`.

## Scope
1. Add local deployment scripts/config for Plane.
2. Provide one-command start/stop/status flow.
3. Create `trade_bot` workspace/project and base states.
4. Create/import initial kickoff tickets.
5. Provide runbook for PM and for agent operations.

## Technical Tasks
1. Deployment assets
   - Add `scripts/plane/` with:
     - `up.sh`
     - `down.sh`
     - `status.sh`
     - `logs.sh`
   - Add local env template (no secrets committed).
2. Service availability
   - Document local URL and health check.
   - Ensure stack restarts cleanly.
3. Board bootstrap
   - States: `Backlog`, `In Progress`, `Review`, `Blocked`, `Done`.
   - Priority + Assignee enabled.
4. Seed data
   - Create at minimum:
     - `KICKOFF-001`
     - `KICKOFF-002`
     - `KICKOFF-003`
     - P0 items from kickoff backlog
   - Total seeded tickets: >= 10.
5. Documentation
   - `docs/process/plane-setup.md`
   - `docs/process/plane-agent-operations.md`

## Agent Operation Requirements
Document practical operations for Codex/agent:
- create ticket
- edit title/description
- change state
- assign owner
- set priority

Preferred path: API token + endpoint examples.
Fallback: UI procedure.

## Acceptance Criteria
1. Plane starts locally using project scripts.
2. PM can open board and see seeded tickets.
3. At least 10 tickets present and distributed by status.
4. One ticket demonstrated through full flow (`Backlog -> In Progress -> Review -> Done`).
5. Setup and operations docs are complete and verified.

## Evidence Required
- Command log (start/status)
- Screenshot(s) or equivalent proof of board state
- List of seeded tickets
- Runbook links

## Out of Scope
- Cloud hosting
- SSO
- Advanced role matrix

## Definition of Done
- All acceptance criteria passed
- PM validates usability
- Parent ticket PM-801 is ready for closure

## Implementation Progress
- [x] Deployment scripts added in `scripts/plane/`
- [x] Environment template added (`scripts/plane/.env.example`)
- [x] Runbooks added:
  - `docs/process/plane-setup.md`
  - `docs/process/plane-agent-operations.md`
- [x] Kickoff seed script added (`scripts/plane/seed_kickoff_tickets.sh`)
- [ ] Local runtime validation on this machine (Docker unavailable in current execution environment)
