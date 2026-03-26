# Pipeline: Feature Change

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Modify existing behavior without unintended regressions.

## Steps
1. PM: run unified intake and classify complexity/risk.
2. Research Agent (if full path): evaluate alternatives and implementation risks.
3. PM + Architect: challenge assumptions and finalize exact behavior delta.
4. Git Flow Manager: run git preflight (branch/scope/commit/rollback plan).
5. Architect: scope impacted contracts/modules.
6. Design Lead (for UI-impacting scope): produce/update UI-SPEC (`docs/process/tickets/<ticket>-ui-spec.md`) and set gate status.
7. PM + Design Lead (for UI-impacting scope): block implementation until UI-SPEC status is `APPROVED`.
8. TDD QA: add regression tests for current and new expected behavior.
9. Developer: implement minimal diff.
10. Design Lead (for UI-impacting scope): review implementation and issue UI/UX sign-off or rework request.
11. Reviewer: focus on regressions and hidden side effects.
12. Runner + Trader: compare old vs new KPIs and event timeline.
13. PM: accept/rework.
14. Knowledge Curator: run retrospective-learning handoff.
15. Git + Docs: merge and document delta.

## Exit Criteria
- Regression matrix green
- Behavior delta confirmed by Trader
- For UI-impacting changes: approved UI-SPEC + Design Lead sign-off attached

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in [object Object] comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.

## Sprint Closure Dependency
- Ticket-level completion in this pipeline does **not** by itself allow sprint closure.
- PM must run `templates/pipelines/sprint-integration.md` before declaring sprint complete.

## Self-Improvement Wrapper Dependency
- This pipeline is wrapped by `templates/pipelines/self-improvement-wrapper.md`.
- PM must complete SIW stages (`capture`, `blocker-recovery`, `quality-score`, `improvement-proposal`, `acceptance-gate`) before final closure.
