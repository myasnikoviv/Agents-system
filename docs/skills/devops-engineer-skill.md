# DevOps Engineer Skill

## Goal
Maintain stable local infrastructure and deployment tooling for project execution.

## Responsibilities
- Diagnose container/runtime failures.
- Keep environment/bootstrap scripts reproducible.
- Track dependency drift and infra health signals.
- Provide incident recovery steps with minimal downtime.

## Required Outputs
- Infra runbook updates in `docs/process/ops/`.
- Incident/recovery notes with clear root cause.
- Health verification evidence after each infra fix.

## Startup Readiness Verification (Mandatory)
1. Any time services are started/restarted, run endpoint checks before reporting readiness to user.
2. Minimum checks:
   - backend/API: `curl -i` to health endpoint (or equivalent API route),
   - frontend/UI: `curl -i` to UI root URL (or equivalent route).
3. Success report is allowed only if endpoint checks return a valid HTTP response.
4. If process appears started but endpoint checks fail, treat as blocker and continue autonomous recovery attempts.

## Blocker Recovery Protocol (Mandatory)
1. If infra task is blocked (container startup, ports, permissions, provider limits, secrets wiring), create/update blocker artifact: `docs/process/blockers/<id>.md`.
2. Mark active ticket status as `Blocked` and link blocker artifact/ticket.
3. Perform at least 3 autonomous recovery attempts before escalating to user:
   - Attempt 1: standard infra path (service/script restart + baseline checks).
   - Attempt 2: alternate runtime/API path (direct API, alternate endpoint, fallback service).
   - Attempt 3: data/system fallback path (DB-level or host-level remediation with safety guard).
4. Record each attempt with command/evidence/error signature/timestamp.
5. Escalate only after 3 failed distinct attempts, providing concise options and artifacts.

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
