# Skill: Blocker Recovery

## Purpose
Resolve execution blockers autonomously before involving the user, while preserving traceability and pipeline continuity.

## Trigger
- Any hard failure that blocks current ticket progress (tool failure, API auth failure, environment mismatch, infra outage, data access failure).

## Mandatory Protocol
1. Detect blocker and classify category:
   - `tool/mcp`
   - `api/auth`
   - `infra/runtime`
   - `data/db`
   - `policy/permission`
2. Create blocker ticket and link dependencies:
   - Set current ticket state to `Blocked`.
   - Link current ticket as blocked by blocker ticket.
   - Move active execution context to blocker ticket.
3. Run autonomous recovery loop (minimum 3 attempts):
   - Attempt 1: native tool/MCP path.
   - Attempt 2: direct API/CLI path.
   - Attempt 3: infra/data fallback path (for example DB-level or environment-level workaround).
4. For each attempt, record:
   - hypothesis
   - command/action
   - result
   - next adjustment
5. If all 3 attempts fail:
   - attach blocker report with exact evidence
   - escalate to user with concise decision request and options.

## Escalation Guard
- Forbidden: “it failed” escalation after single attempt.
- Required before escalation: three distinct attempts + evidence + current best workaround recommendation.

## Evidence Requirements
- Plane comments on blocker ticket for each attempt.
- Blocker report file: `docs/process/blockers/<id>.md`.
- Pipeline state update with blocker context and owner handoff.

## Exit Criteria
- Blocker resolved and validated.
- Original ticket moved from `Blocked` to `In Progress`.
- Blocker ticket closed with final fix summary and prevention note.

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
