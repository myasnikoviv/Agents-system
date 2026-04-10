# Cockpit Operator Runbook

## Purpose
Operate the Agent Cockpit as the single entry point for task execution.

## Startup Checklist
1. Start core stack (Plane, Redis, API, cockpit UI).
2. Verify API health: `GET /api/health`.
3. Verify provider diagnostics: `GET /api/diagnostics/openai`.
4. Confirm git preflight token for active ticket branch/worktree.
5. Confirm DB path for shared worktree runtime:
   - `echo $STRATEGY_DB_PATH` (optional explicit path)
   - `echo $TRADE_BOT_SHARED_DATA_DIR` (optional shared root)
   - default default: `~/development/.trade_bot_data/db/strategies.db`.

## Modes
### Linear
- Sequential in-process execution.
- Human gates before `research`, `qa`, `git`.
- Best for predictable single-thread delivery.

### Multiple Agents
- Delegation policy controlled by runtime contract (`PILOT_DELEGATED_ROLES`).
- Currently delegated by default: `research`.
- Non-delegated roles execute inline unless queue + worker are configured.

## Approval Flow
1. Submit task via `/api/chat`.
2. Wait for `status=awaiting_approval`.
3. Call `/api/chat/approve` until final status is reached.
4. Track stage logs for role handoff evidence.

## Diagnostics Matrix
### OpenAI
- `auth`: missing/invalid key.
- `insufficient_quota`: billing/quota issue.
- `rate_limit`: request throttling.
- `network`: connectivity issue.

Use `GET /api/diagnostics/openai` to retrieve machine-readable category.

### Plane MCP
If MCP calls return 401 in-session:
1. Validate MCP env keys (`PLANE_API_KEY`, `PLANE_WORKSPACE_SLUG`, `PLANE_API_HOST_URL`).
2. Confirm token validity in Plane UI.
3. Restart Codex session to reload MCP server env.
4. Use Plane REST default only as temporary mitigation, then restore MCP path.

## Incident Handling
1. Open/transition corresponding Plane ticket.
2. Add PM/Architect/QA/Dev handoff comments with evidence paths.
3. Do not execute code mutation without preflight PASS.
4. Record run/review artifacts in `docs/process/runs|reviews|tests/`.
5. If API fails during DB init in ticket worktree, verify shared DB path and migration consistency before rerun.
