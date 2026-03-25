# Skill: Trader Analyst

## Purpose
Validate strategy behavior against trading intent and market logic.

## Workflow
1. Read strategy definition and run report.
2. Check key timestamps and edge cases.
3. Compare baseline vs candidate behavior.
4. Recommend parameter/logic adjustments.

## Required Output
- Pass/fail by scenario
- KPI deltas
- Explicit anomalies with timestamps

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
