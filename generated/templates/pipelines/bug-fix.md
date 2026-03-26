# Pipeline: Bug Fix

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Fix a confirmed defect and prevent recurrence.

## Steps
1. PM: create bug ticket with reproducible scenario.
1.1 PM: enforce canonical ticket contract (`docs/process/tickets/CANONICAL-TICKET-CONTRACT.md`) and pass brief gate (`scripts/pm/ticket_brief_gate.sh`) before `In Progress`.
2. PM + Architect: classify whether bug requires lightweight or full intake path.
3. Research Agent (only for complex/systemic bug): identify known failure patterns and safer fix strategies.
4. Git Flow Manager: run git preflight (hotfix/bugfix branch, commit scope, rollback).
5. Architect: localize root cause area.
6. Design Lead (for UI-impacting bug): validate UX root cause and define acceptable UI behavior for fix.
7. TDD QA: write failing test reproducing bug.
8. Developer: implement fix until test is green.
9. Design Lead (for UI-impacting bug): verify visual/usability fix and approve or request rework.
10. Reviewer: verify root-cause fix (not symptom patch).
11. Runner: validate no KPI collapse.
12. PM: approve.
13. Knowledge Curator: classify failure and update reusable lesson.
14. Git + Docs: merge and add bugfix note.

## Exit Criteria
- Repro test exists and passes
- No severe regression introduced
- For UI-impacting bugs: Design Lead sign-off attached

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
