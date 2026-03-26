# Skill: Plane Project Management DB Fallback

## Purpose
Keep project management flow operational when Plane MCP and direct API token path are unavailable.

## Trigger
- Plane MCP calls fail due to auth/runtime mismatch.
- Direct API calls fail due to token/workspace mismatch.
- PM still must manage issue lifecycle without blocking delivery.

## Primary Strategy
1. Try Plane MCP flow first.
2. If MCP fails, run direct API flow.
3. If API fails, run controlled DB-read/DB-write fallback using project runtime DB path and documented scripts.

## DB Fallback Guardrails
- Use DB fallback only for critical ticket-lifecycle continuity.
- Apply minimum required mutations only (state, assignee, handoff note pointer, linkage IDs).
- Record every DB fallback action in:
  - `[object Object]` comments (when service recovers), and
  - `docs/process/blockers/<id>.md` with SQL/script evidence.
- After recovery, reconcile DB-side actions back through official Plane API/MCP.
- Never use this flow against production DB without explicit human approval.

## Required Inputs
- Active ticket id and expected state transition.
- Current pipeline/stage and handoff owner.
- Runtime DB connectivity path from ops runbooks.

## Execution Pattern
1. Confirm blocker category (`api/auth` or `tool/mcp`).
2. Open blocker ticket and link current ticket.
3. Execute read checks (issue exists, current state, assignee).
4. Execute minimal write operation required for continuity.
5. Validate write with read-back query.
6. Continue pipeline and mark fallback mode in pipeline state card.
7. Reconcile to official Plane channel when restored.

## Exit Criteria
- Ticket lifecycle progressed without data corruption.
- All fallback actions are traceable and reconciled.
- PM closes blocker with prevention note (env/auth/runtime hardening).

## Related References
- `../process/plane-agent-operations.md`
- `../process/ops/db-mcp-setup.md`
- `../process/ops/db-shared-storage.md`
- `./blocker-recovery-skill.md`
