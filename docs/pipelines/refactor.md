# Pipeline: Refactor

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Improve structure/maintainability without behavior change.

## Steps
1. PM + Architect: define non-functional target and guardrails.
2. PM: decide intake mode (full path required if architecture surface is broad).
3. Research Agent (if full path): evaluate refactor patterns and migration risk.
4. Git Flow Manager: run git preflight (scope split + commit plan mandatory).
5. TDD QA: freeze behavior with characterization tests.
6. Developer: refactor in small safe commits.
7. Reviewer: enforce no behavior drift.
8. Runner: compare baseline and refactor outputs.
9. PM: accept only if parity confirmed.
10. Knowledge Curator: store lessons and anti-pattern notes.
11. Git + Docs: merge with architecture note.

## Exit Criteria
- Behavior parity proven
- Complexity/readability improved

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in Plane comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.


## Self-Improvement Wrapper Dependency
- This pipeline is wrapped by `docs/pipelines/self-improvement-wrapper.md`.
- PM must complete SIW stages (`capture`, `blocker-recovery`, `quality-score`, `improvement-proposal`, `acceptance-gate`) before final closure.
