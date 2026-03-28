# AGSYS-235 Test Report

Date: 2026-03-28
Branch: codex/AGSYS-235-cleanup-apply

## Commands

1. `scripts/git/worktree_cleanup_sweep.sh --apply`
- Result: PASS, deleted merged local branches:
  - codex/AGSYS-223-run-bootstrap-closure
  - codex/AGSYS-224-provider-execution-adapter-closure
  - codex/AGSYS-225-swarm-runtime-refinement-closure
  - codex/AGSYS-226-cockpit-observability-closure
  - codex/AGSYS-229-228-git-conflict-recovery
  - codex/AGSYS-231-pipeline-compliance
  - codex/AGSYS-231-sprint3-integration
  - codex/AGSYS-233-git-hardgate-scripts
  - codex/AGSYS-234-git-hardgate-npm
  - codex/sync-generated-contracts-and-templates

2. `npm run git:audit:strict`
- Result: PASS (clean, no collisions).

## Acceptance

- Cleanup apply executed: ✅
- Strict audit baseline green: ✅
