# TRADE-92 CLI Smoke Matrix (Cockpit Handoff)

- Date: 2026-03-19T16:36:00Z
- Base URL attempted: http://127.0.0.1:3101, http://127.0.0.1:3001
- Scope: live API smoke for Quasi-linear (`linear`) and Multiple agents (`multiple_agents`).

## Results
1. `MODE=dry-run` script check: PASS.
2. Live on `:3101`: FAIL (service unavailable).
3. Live on `:3001`: FAIL (governance guard).

## Blocking Evidence
- `/api/health` on `:3001` => `{"status":"ok"}`
- `/api/chat` on `:3001` => `{"success":false,"error":"governance_blocked:main_branch_mutation_forbidden:main"}`

## Verdict
BLOCKED

## Required Next Step
Run cockpit backend from approved non-main ticket branch/worktree context (or provide approved override policy for QA smoke), then rerun live matrix for both modes.
