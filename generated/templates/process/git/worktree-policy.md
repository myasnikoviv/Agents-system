# Git Worktree Policy

## Goal
Enable safe parallel branch execution on a single host and prevent cross-branch mutation accidents.

## Rules
1. One active worktree per assignee.
2. Root workspace (`/Users/myasnikoviv/development/trade_bot`) is reserved for management, audit, and read-only analysis.
3. All code modifications MUST happen in the assigned worktree.
4. No direct pushes to main from worktrees; use handoff to origin and merge via PM/Git Flow Manager.
5. Worktree prefix: `../trade_bot-worktrees/`.

## Workflow
1. PM creates/updates ticket.
2. Git Flow Manager runs `scripts/git/worktree_add.sh <ticket> <branch>`.
3. Worktree creation syncs local `.env` / `.env.local` from root when missing in target worktree.
4. Agent performs work inside the worktree path.
5. Agent submits for review via branch push.
6. Git Flow Manager runs `scripts/git/worktree_prune.sh` after merge.

## Exceptions
- Pure read-only analysis may run from root workspace.
- Any file modification still requires preflight + assigned worktree.
- If wrong-branch or mixed-scope mutation is detected, execute `docs/pipelines/git-conflict-recovery.md`.

## Audit Routine
1. Git Flow Manager runs `scripts/git/worktree_audit.sh` daily.
2. PM reconciles audit report against sprint backlog.
3. Stale worktrees (no active ticket) are flagged for deletion.
