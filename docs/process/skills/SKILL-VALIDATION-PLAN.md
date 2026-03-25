# Skill Validation Plan

## Functional checks
- [ ] Skill file can be discovered from `skills/` tree.
- [ ] Frontmatter fields are present and parseable.
- [ ] All 13 required schema sections exist.
- [ ] Workflow is executable without hidden prerequisites.
- [ ] Every agent in `docs/agents/` has skill usage rules in runtime catalog.

## Behavioral checks
- [ ] Skill output is specific, not boilerplate.
- [ ] Skill improves a recurring workflow in this repository.
- [ ] Skill does not duplicate another skill without added value.
- [ ] Skill clearly states when not to use it.

## Regression checks (after updates)
- [ ] Previous key scenario still works.
- [ ] Validation checklist remains explicit.
- [ ] Examples are still relevant to current architecture.

## Security checks for imported/adapted skills
- [ ] Declares shell/file side effects.
- [ ] Declares external dependencies and required credentials.
- [ ] No hidden network or execution assumptions.
