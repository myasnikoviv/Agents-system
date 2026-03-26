# Pipeline: Hotfix

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Emergency production-safe correction with minimal blast radius.

## Steps
1. PM + Architect: define smallest safe patch.
2. PM: record intake mode as `lightweight-emergency` or escalate to full path if ambiguity is high.
3. Git Flow Manager: run git preflight for emergency path (branch/scope/rollback).
4. TDD QA: write targeted failing test.
5. Developer: implement minimal hotfix.
6. Reviewer: strict correctness review.
7. Runner: short critical smoke run.
8. PM: immediate go/no-go.
9. Knowledge Curator: append incident lesson and prevention note.
10. Git: hotfix branch merge and tag.
11. Docs: incident and hotfix record.

## Exit Criteria
- Critical issue removed
- Smoke checks pass
- Incident log updated

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in [object Object] comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.


## Self-Improvement Wrapper Dependency
- This pipeline is wrapped by `templates/pipelines/self-improvement-wrapper.md`.
- PM must complete SIW stages (`capture`, `blocker-recovery`, `quality-score`, `improvement-proposal`, `acceptance-gate`) before final closure.
