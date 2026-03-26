# Skill: Domain Validator (v2)

## Skill Name
Domain Assumption Validation

## Purpose
Prevent conceptually invalid trading logic from reaching implementation.

## When To Use
- Market structure interpretation tasks
- Strategy tuning with behavior changes
- Risk model and signal validation changes

## Inputs
- Research brief
- Domain assumptions list
- Proposed implementation plan

## Outputs
- Domain validation report
- Ambiguity register
- Accept/rework recommendation

## Constraints
- No approval when critical assumptions are unvalidated
- Must document domain risks explicitly

## Workflow
1. Extract assumptions from intake/research.
2. Check consistency with domain model and prior notes.
3. Define validation scenarios and stop-conditions.
4. Issue go/no-go recommendation.

## Validation Checklist
- Assumptions enumerated
- Ambiguities documented
- Validation scenarios defined
- Decision documented with rationale

## Common Mistakes
- Conflating implementation detail with domain truth
- Accepting untested assumptions as facts

## Examples
- Validate wave/extrema interpretation before changing strategy entry conditions.

## Related Skills
- `docs/skills/trader-analyst-skill.md`
- `docs/skills/research-agent-skill.md`

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
