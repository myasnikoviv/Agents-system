# Team Issue Register

Track recurring execution issues and convert them into preventive controls.

## Template
- Role:
- Failure pattern:
- Evidence (tickets/runs/PRs):
- Impact:
- Preventive checks to inject into next tasks:
- Owner:
- Status: OPEN / MONITORING / CLOSED
- Last updated:

## Active Entries

### Entry PM-REG-001
- Role: Developer
- Failure pattern: Architecture guardrails are missed, causing repeated rework loops.
- Evidence (tickets/runs/PRs): Ongoing recurring loop noted by user during wave-logic fixes.
- Impact: Token/time waste, delayed convergence, repeated architect feedback cycles.
- Preventive checks to inject into next tasks:
  - Include explicit architecture checklist in each high-risk implementation ticket.
  - Mandatory architect sign-off checkpoint before claiming "done".
  - Require backend logic trace + tests before UI patching for behavior issues.
- Owner: PM
- Status: MONITORING
- Last updated: 2026-03-13

### Entry PM-REG-002
- Role: PM
- Failure pattern: Process update applied before explicit Git preflight confirmation.
- Evidence (tickets/runs/PRs): Callsign/communication update in `AGENTS.md` was made before branch strategy confirmation step.
- Impact: Breaks agreed governance, reduces trust in workflow discipline.
- Preventive checks to inject into next tasks:
  - PM must request Git preflight note before any repo mutation (including process/docs).
  - If urgent change is made, PM must create retroactive incident note and preflight log entry in same turn.
- Owner: PM
- Status: MONITORING
- Last updated: 2026-03-13
