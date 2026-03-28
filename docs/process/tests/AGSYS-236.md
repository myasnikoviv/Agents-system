# AGSYS-236 Test Report

Date: 2026-03-28
Branch: codex/AGSYS-236-start-all-restart-check

## Investigation

### Code inspection
- `scripts/infra/start_all.sh` previously only used `lsof` checks and skipped restart when ports were already occupied.
- Backend restart capability existed in `scripts/infra/backend_ctl.sh` (`restart`) but was not invoked by `start_all.sh` if port 3001 was already in use.

### Runtime proof
1. `bash scripts/infra/start_all.sh --standalone`
- Result: reported `already running` for backend/UI (no restart).

2. `bash scripts/infra/start_all.sh --standalone --restart`
- Result: backend explicitly restarted via `backend_ctl.sh restart`.
- Result: cockpit UI process(es) on port 5174 terminated and UI relaunched.
- Health checks passed after restart.

## Conclusion

`start_all.sh` now supports explicit restart semantics via `--restart` / `--force-restart`.
Default behavior remains non-disruptive (skip when already running).
