# Plane Agent Operations

## Objective
Allow Codex/agent to operate ticket lifecycle reliably.

## Source of truth
- Ticket status and ownership: Plane
- Deep technical context and evidence: markdown files in `docs/process/*`

## Required Fields
- State (Backlog/In Progress/Review/Blocked/Done)
- Priority
- Assignee (mandatory for active tickets)
- Full description (mandatory before `In Progress`)
- Expected pipeline (who handles which stage)
- Git preflight note (mandatory before implementation stage)

## Operation Modes

### Mode A: API (preferred)
Use API token from `scripts/plane/.env` via `x-api-key` header.

Common operations:
1. Create issue
2. Update issue fields
3. Move issue state
4. Assign owner
5. Post handoff comment with evidence before re-assign

### Mode B: UI (default)
If API schema differs from examples, use UI operations and keep markdown evidence linked.

## API Bootstrap
1. Generate Plane API token (user settings).
2. Fill in `.env`:
   - `PLANE_API_BASE`
   - `PLANE_API_TOKEN`
   - `PLANE_WORKSPACE_SLUG`
   - `PLANE_PROJECT_ID`

## Seed Initial Tickets
```bash
./scripts/plane/seed_kickoff_tickets.sh
```

## Suggested Governance
1. Each issue title starts with ticket id (`PM-801`, `DEV-811`, etc.).
2. Description is technical-task complete, not title-only.
3. Description must include:
   - Context / Problem
   - Scope / Out of scope
   - Phases
   - Dependencies
   - Acceptance criteria
   - Evidence required
4. Description includes link/path to markdown source file.
5. State transitions follow pipeline sequence.
6. Ticket without assignee cannot move to `In Progress`.
7. Ticket without complete description cannot move to `In Progress`.
8. Ticket must define expected pipeline chain (`PM -> Architect -> QA -> Dev -> Review -> Runner -> Trader -> PM`, adjusted per type).
9. Any handoff requires:
   - assignee change,
   - comment with result summary,
   - artifact link(s) (tests/runs/review/docs/commits as applicable),
   - explicit next action for new owner.
10. Rejections must be routed back to the responsible role (not silently moved by status only).
11. If context is missing, owner must request clarification and keep ticket out of active execution until clarified.
12. Ticket cannot enter implementation without Git preflight note from Git Flow Manager.
13. Ticket cannot enter implementation without worktree assignment for the assignee (when file mutations are expected).

## Mapping Recommendation
- `docs/process/tickets/*.md` <-> Plane issues (1:1)
- `docs/process/tests|runs|reviews/*.md` linked as evidence in issue comments
