# AGSYS-233 Requirements Pack

- Ticket: AGSYS-233
- Pipeline: new-feature
- Goal: restore missing git hard-gate scripts referenced by AGENTS.md policy.
- Scope:
  - add `scripts/git/worktree_audit.sh`
  - add `scripts/git/worktree_cleanup_sweep.sh`
  - add usage/exit-code documentation
- Acceptance:
  - both scripts executable
  - both scripts run successfully in repository
