# GIT-608 Recovery Map

Date: 2026-03-19
Owner: `Пан Гілка (Git Flow Manager)`
Pipeline: `docs/pipelines/git-conflict-recovery.md`

## Source Workspace
- Path: `/Users/myasnikoviv/development/trade_bot`
- Current branch: `codex/TKT-66-mcp-auth-hardening`

## Destination Workspace
- Path: `/Users/myasnikoviv/development/trade_bot-worktrees/GIT-608`
- Branch: `codex/GIT-608-worktree-recovery`

## Classification Decision
- Keep in source ticket (`TKT-66`): MCP auth/environment specific fixes only.
- Move to destination (`GIT-608`):
  - pipeline hard-gate enforcement,
  - skill-system schema lint integration,
  - runtime skill routing + agent skill rules,
  - git/process recovery artifacts.
- Discard: none.

## Split Plan
1. Snapshot taken (`GIT-608-recovery.patch`, status/files snapshots).
2. Apply split in dedicated GIT-608 worktree.
3. Verify with skill lint + runtime e2e tests.
4. Re-audit worktree registry and close incident.
