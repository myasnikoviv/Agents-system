# Git Worktree Registry

Track active worktree assignments to prevent branch/worktree collisions.

## Fields
- Ticket ID
- Assignee Callsign
- Branch Name
- Worktree Path
- Status (`ACTIVE` | `RELEASED`)
- Started (Date)
- Released (Date)
- Notes

## Active Entries
Use this section as a runtime ledger in generated artifacts. Keep template source free of project-specific tickets.

| Ticket | Assignee | Branch | Worktree | Status | Started | Released | Notes |
|---|---|---|---|---|---|---|---|
| `<ticket-id>` | `Пан Гілка (Git Flow Manager)` | `codex/<ticket-id>-<scope>` | `<absolute-worktree-path>` | `ACTIVE` | `<YYYY-MM-DD>` | `` | `<scope summary>` |

## Rules
- One active ticket per branch/worktree.
- Any collision triggers `pipeline=git-conflict-recovery`.
- Release entry immediately after merge/cleanup.
