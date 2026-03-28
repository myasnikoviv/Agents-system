# AGSYS-233 Assumptions Review

- Repository can have multiple worktrees and local topic branches.
- Audit should fail on dirty worktrees and branch collisions.
- Cleanup should be safe by default (dry-run) and explicit on deletion (`--apply`).
- `main`/`master` and current branch must always be protected.
