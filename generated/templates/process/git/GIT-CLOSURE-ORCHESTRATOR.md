# Git Closure Orchestrator

Use `scripts/git/closure_orchestrator.sh <ticket>` to run standardized closure flow.

## Modes
- `MODE=dry-run` (default)
  - validates preflight
  - checks merge readiness
  - runs drift audit (non-blocking summary in dry-run)
- `MODE=apply`
  - validates preflight
  - enforces merge readiness (unless `ALLOW_UNMERGED=1`)
  - runs cleanup sweep
  - runs blocking drift audit

## Examples
```bash
MODE=dry-run bash scripts/git/closure_orchestrator.sh TRADE-75
MODE=apply bash scripts/git/closure_orchestrator.sh TRADE-75
```

