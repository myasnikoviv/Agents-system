# AGSYS-212 — Cockpit Executor Backplane (Claude CLI + Codex CLI)

## Context / Problem
Cockpit can select providers/models in UI, but execution path lacked a production-grade CLI executor backplane aligned with LangGraph runtime behavior and health checks.

## Scope
- Included: executor config surface, CLI execution adapter (claude/codex), server endpoints for settings/status/test/login, cockpit settings wiring.
- Excluded: full production secrets vault and provider billing telemetry.

## Existing Phase
Implementation + verification in AGSYS sprint.

## Dependencies
- Runtime executor contracts in `src/runtime`.
- Cockpit settings UI/API routes.
- CLI binaries availability (`claude`, `codex`).

## Acceptance Criteria
1. Cockpit supports selecting executor backend: `openai`, `claude-cli`, `codex-cli`.
2. Settings API persists and serves executor configuration.
3. CLI status/test/login endpoints respond with actionable diagnostics.
4. Execution route can run via configured CLI backend.
5. Unit tests for adapter pass and frontend typecheck passes.

## Evidence Required
- Test report: `docs/process/tests/AGSYS-212-executor-backplane-smoke.md`
- Design/architecture note: `docs/process/designs/AGSYS-executor-backplane-options.md`
- Commit diff with runtime + UI + server changes.

## Expected Pipeline
1. PM
2. Architect
3. Developer
4. QA
5. Reviewer
6. Git

## Handoff Protocol
Each stage updates pipeline-state, links artifacts, and names next owner explicitly.

## Git Preflight
- Branch: `codex/AGSYS-212-executor-cli`
- Worktree: `/Users/myasnikoviv/development/trade_bot-worktrees/AGSYS-212`
- Token: `docs/process/git/preflights/AGSYS-212.env`

## Gate
Done only after CLI/API smoke + frontend typecheck + merge to main.
