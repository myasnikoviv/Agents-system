# Pipeline: Retrospective & Learning

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Prevent repeated failures by converting outcomes into reusable knowledge and controlled instruction/skill evolution.

## Steps
1. PM closes delivery decision (accept/rework/drop).
2. Knowledge Curator runs post-task review.
3. Root-cause classification:
   - requirements misunderstanding
   - architecture violation
   - implementation bug
   - testing gap
   - missing domain knowledge
   - missing skill
   - missing checklist
4. Retrospective report is created in `docs/process/retrospectives/<id>.md`.
5. KB entries are added/updated in `docs/knowledge/`.
6. If needed, proposals are created:
   - skill create/update in `docs/process/skills/PROPOSAL-<id>.md`
   - instruction evolution in `docs/process/instructions/PROPOSAL-<id>.md`
7. PM + Architect + Reviewer (or role owner) approve/reject critical changes.

## Exit Criteria
- Retrospective report completed
- At least one reusable lesson extracted for non-trivial tasks
- Missing-skill/instruction gaps explicitly resolved or tracked
- Traceability links added to source task/pipeline artifacts

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in Plane comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.

