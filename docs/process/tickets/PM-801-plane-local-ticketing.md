# PM-801: Local Ticketing System (Plane) Deployment

## Type
Infrastructure / Process Enablement

## Priority
P0

## Owner
- Primary: PM Orchestrator
- Implementation: Developer
- Support: Git Flow Manager, Documentation Owner

## Business Need
Current ticket tracking lives in markdown files only. We need a visual and operational ticket system to monitor status, ownership, and execution flow across agents.

## Decision
Use **Plane (self-hosted)** on local machine.

## Scope
1. Deploy Plane locally (Docker-based).
2. Make UI доступним з локальної машини.
3. Create project/workspace for `trade_bot`.
4. Create base workflow states.
5. Import/create kickoff tickets in Plane.
6. Enable agent-operable workflow (create/update/assign/move tickets).

## Mandatory Requirements
1. Local availability
   - Plane is reachable from browser on local host URL.
   - Services persist across restart.
2. Core workflow
   - States at minimum: `Backlog`, `In Progress`, `Review`, `Blocked`, `Done`.
   - Priority field enabled.
   - Assignee field enabled.
3. Agent operations support
   - Documented way for Codex/agent to:
     - create ticket
     - edit title/description
     - change status
     - assign responsible owner
     - set priority
   - Preferred via API token + API endpoint docs; UI fallback is acceptable only as backup.
4. Initial data
   - Kickoff ticket set migrated/created in Plane:
     - `KICKOFF-001`, `KICKOFF-002`, `KICKOFF-003`
     - P0 items from kickoff backlog
5. Ownership model
   - Every active ticket must have `Owner` (assignee).
   - If unassigned, ticket is invalid for execution.

## Acceptance Criteria
1. Plane stack starts with one command and is stable after restart.
2. PM can open board and see tickets + statuses.
3. At least 10 initial tickets visible and categorized.
4. At least one ticket is moved end-to-end (`Backlog -> In Progress -> Review -> Done`).
5. Agent runbook exists with exact commands and API usage examples.

## Out of Scope
- External cloud hosting.
- SSO/advanced enterprise auth.
- Multi-team permission matrix.

## Deliverables
1. `scripts/plane/` deployment and maintenance scripts.
2. `docs/process/plane-setup.md` (install/run/troubleshooting).
3. `docs/process/plane-agent-operations.md` (API + ticket operations).
4. Seed script or procedure for initial ticket creation.

## Linked Implementation Ticket
- `DEV-811`: `docs/process/tickets/DEV-811-plane-local-deployment.md`

## Risks
1. Plane setup complexity (containers, env vars).
2. API auth friction for automated agent operations.
3. Inconsistent sync between markdown tickets and Plane if governance is not defined.

## Mitigations
1. Add healthcheck script and restart instructions.
2. Store local API token setup process in runbook.
3. Define Plane as source-of-truth for status; markdown as detailed artifact storage.

## Definition of Done
- All acceptance criteria are met.
- PM confirms monitoring usability.
- Developer confirms agent-operable CRUD flow.
