# Main Branch Override Policy

## Default Rule
- Direct commit/push on `main`/`master` is forbidden for agent workflows.
- Required path is: ticket -> preflight -> assigned `codex/*` branch/worktree -> merge flow.

## Emergency Override (Human Controlled)
- Override is allowed only with explicit human approval trace.
- Set env var `GIT_MAIN_OVERRIDE_FILE` to a file containing:
  - `OVERRIDE_ID=...`
  - `APPROVED_BY=...`
  - `APPROVED_AT=...`
  - `REASON=...`

## Script Enforcement
- Local hooks call:
  - `scripts/git/main_branch_guard.sh`
  - `scripts/git/preflight_guard.sh`
- CI also calls `scripts/git/main_branch_guard.sh`.

## Example Override File
Use: `docs/process/git/overrides/OVERRIDE-TEMPLATE.env`

