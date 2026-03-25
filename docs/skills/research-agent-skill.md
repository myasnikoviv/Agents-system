# Skill: Research Agent (v2)

## Skill Name
Research Before Implementation

## Purpose
Produce an evidence-based recommendation before coding for complex tasks.

## When To Use
- New feature with non-trivial architecture impact
- Strategy/domain-heavy tuning
- User request with strong assumptions and limited evidence

## Inputs
- Intake brief
- Clarification notes
- Existing architecture and KB entries

## Outputs
- Research brief with problem framing, options, trade-offs, recommendation, risks, unknowns

## Constraints
- No direct implementation code changes in this stage
- Must include at least one viable alternative

## Workflow
1. Frame problem and success metric.
2. Collect known constraints from architecture and domain notes.
3. Compare alternatives and expected failure modes.
4. Recommend path and define unknowns to validate.

## Validation Checklist
- Problem statement refined
- Assumptions explicit
- Options compared
- Risks/unknowns listed
- Recommendation actionable

## Common Mistakes
- Echoing user proposal without challenge
- Missing risk analysis
- Skipping reusable prior decisions

## Examples
- Choosing between extending existing strategy compiler vs introducing a new execution abstraction.

## Related Skills
- `docs/skills/solution-architect-skill.md`
- `docs/skills/trader-analyst-skill.md`

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
