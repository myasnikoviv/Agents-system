# Worktree Hard-Gate Scripts

## scripts/git/worktree_audit.sh

Purpose: detect git drift before mutation/integration.

Checks:
- all worktrees are present and readable
- each worktree is clean (`git status --porcelain` empty)
- no non-detached branch is mounted by multiple worktrees

Modes:
- default: report-only (always exits `0`, prints WARN on findings)
- `--strict`: hard-gate mode (exits `1` when findings exist)

Exit codes:
- `0` pass
- `1` drift/collision found (`--strict` mode)
- `2` not a git repository

## scripts/git/worktree_cleanup_sweep.sh

Purpose: prune stale worktree metadata and sweep merged local branches.

Modes:
- default: dry-run (reports candidates only)
- `--apply`: deletes merged local candidate branches

Safety:
- never deletes `main`/`master`
- never deletes current branch
- never deletes branches currently used by any worktree
