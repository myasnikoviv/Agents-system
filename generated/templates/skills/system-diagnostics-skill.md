# System Diagnostics Skill

Description: Internal tool for auditing the runtime environment.

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
