# Skill: Knowledge Curator (v2)

## Skill Name
Retrospective to Reusable Knowledge

## Purpose
Convert completed task evidence into reusable lessons, proposals, and policy-safe improvements.

## When To Use
- After each medium/high complexity task
- After incidents, regressions, or repeated review findings

## Inputs
- Review report
- Test/run evidence
- PM decision and handoff artifacts

## Outputs
- Retrospective report
- KB entries
- Skill/instruction proposal artifacts

## Constraints
- Critical policy updates require review approval
- Trace every update to source evidence

## Workflow
1. Classify outcomes (worked/failed/unknown).
2. Run root-cause analysis.
3. Map failures to missing skill/checklist/instruction classes.
4. Generate proposals and update KB links.

## Validation Checklist
- Failure class assigned
- Root cause captured
- Reusable lesson extracted
- Proposal status set (draft/review/approved/deprecated)

## Common Mistakes
- Writing task-specific notes as reusable rules
- Missing confidence and applicability scope

## Examples
- Recurring missed edge-case test leads to new QA checklist update proposal.

## Related Skills
- `docs/skills/tdd-qa-skill.md`
- `docs/skills/code-reviewer-skill.md`

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
