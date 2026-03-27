# AGSYS-213 Test & Postflight Report

## Ticket
- ID: `AGSYS-213`
- Pipeline: `feature-change`
- Branch: `codex/AGSYS-213-config-ia-cleanup`

## Preflight
- Token: `docs/process/git/preflights/AGSYS-213.env`
- Validation: PASS (`STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, branch/worktree match)

## Checks
1. Frontend build
   - Command: `npm --prefix frontend run build`
   - Result: PASS

2. Backend API smoke
   - Command: `curl -i -sS http://127.0.0.1:3001/api/cockpit/providers`
   - Result: PASS (HTTP 200)
   - Verified fields in payload:
     - `capabilities.effectiveMode = cli`
     - `capabilities.selectedBackend = codex-cli`
     - `capabilities.supportsDirectProviderConfig = false`

## Notes
- Backend restart executed via infra script: `bash scripts/infra/backend_ctl.sh start`.
- Endpoint contract now exposes capability fields used by Settings IA gating.

## Status
- Current phase: implementation + smoke PASS
- Next gate: code review + remaining AGSYS-213 acceptance checks in runtime UI
