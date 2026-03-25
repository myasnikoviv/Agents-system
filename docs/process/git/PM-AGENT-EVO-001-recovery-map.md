# Recovery Map: PM-AGENT-EVO-001

## Incident
Work was executed in wrong branch: `codex/pm-ticket-hygiene-and-gitflow-guard`.

## Target
Move all Agent Evolution v2 artifacts to dedicated branch:
`codex/agent-evo-v2-foundation`.

## File Scope Decision

### Move to target ticket `PM-AGENT-EVO-001`
- `AGENTS.md`
- `docs/agents/*.md` (all current agent changes and new agents)
- `docs/skills/*.md` (PM v2 + new skill specs)
- `docs/knowledge/**`
- `docs/pipelines/new-feature.md`
- `docs/pipelines/feature-change.md`
- `docs/pipelines/bug-fix.md`
- `docs/pipelines/hotfix.md`
- `docs/pipelines/refactor.md`
- `docs/pipelines/strategy-tuning.md`
- `docs/pipelines/unified-task-intake.md`
- `docs/pipelines/retrospective-learning.md`
- `docs/pipelines/git-conflict-recovery.md`
- `docs/process/README.md`
- `docs/process/INDEX.md`
- `docs/process/designs/COGNITIVE-PLATFORM-ROADMAP-v1.md`
- `docs/process/retrospectives/**`
- `docs/process/skills/**`
- `docs/process/instructions/**`
- `docs/process/git/GIT-CONFLICT-RECOVERY-TEMPLATE.md`
- `docs/process/git/worktree-policy.md`
- `docs/process/pm/git-preflight-log.md`

### Keep in source branch (`codex/pm-ticket-hygiene-and-gitflow-guard`)
- None from current working set.

### Discard
- None.

## Notes
Exact final list is validated by Git Flow Manager before commit using
`git status --short` and `git diff --name-only`.
