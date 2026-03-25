# Pipeline: Self-Improvement Wrapper

## Goal
Wrap any execution pipeline with measurable quality control, blocker recovery loops, and mandatory improvement proposals.

## Trigger
Run this wrapper for every major execution pipeline:
- `new-feature`
- `feature-change`
- `bug-fix`
- `hotfix`
- `refactor`
- `strategy-tuning`
- `release`
- `rollback-incident`
- `design-audit`
- `infrastructure-operations`

## Inputs
- Parent pipeline id and stage history
- Plane ticket ids and status transitions
- Test evidence (CLI/API/UI)
- Review findings and rework loops
- Git artifacts (branch/worktree/preflight/audit/cleanup)

## Wrapper Stages
1. `siw.capture`:
- PM records execution trace in `docs/process/pm/pipeline-state/<ticket-or-thread>.md`.
- Collect iteration counters: rejected reviews, failed tests, blocker retries, handoff hops.

2. `siw.blocker-recovery`:
- If blocker appears, create blocker ticket and link dependency.
- Perform up to 3 autonomous recovery attempts before escalating to human.
- Document attempts and evidence in ticket comments.

3. `siw.quality-score`:
- Compute quality score for the run (delivery, test completeness, rework rate, drift incidents).
- Attach score and rationale to retrospective artifact.

4. `siw.improvement-proposal`:
- PM must create/update improvement ticket when quality threshold is not met.
- Proposal targets one or more of: agent files, skills, pipelines, tool integrations.

5. `siw.acceptance-gate`:
- Parent pipeline cannot be marked `Done/Closed` without SIW evidence.
- Sprint closure is blocked if any SIW-required artifact is missing.

## Required Artifacts
- `docs/process/retrospectives/<ticket>.md` with SIW section
- `docs/process/instructions/<ticket>.md` or `docs/process/skills/<ticket>.md` when improvement is required
- Plane comment with links to all SIW artifacts

## Exit Criteria
- Blockers resolved or explicitly escalated with evidence
- Improvement proposal created when quality below threshold
- PM confirms SIW completion in pipeline-state artifact
