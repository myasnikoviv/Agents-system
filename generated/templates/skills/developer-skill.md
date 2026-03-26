# Skill: Developer

## Purpose
Implement scoped fix/feature to satisfy prewritten tests.

## Workflow
1. Implement smallest change for first failing test.
2. Iterate until all target tests are green.
3. Keep contracts and manifests in sync.
4. Prepare concise technical summary.
5. On blocker: execute `docs/skills/blocker-recovery-skill.md` and do not escalate to user before 3 distinct recovery attempts are logged.

## Required Output
- Green test run
- Changed files list
- Contract/migration note (if any)
- Blocker attempt log (if blocker occurred)

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
