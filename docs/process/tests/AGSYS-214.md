# AGSYS-214 Test & Postflight Report

## Ticket
- ID: `AGSYS-214`
- Pipeline: `feature-change`
- Branch: `codex/AGSYS-214-runtime-capability-contract`

## Preflight
- Token: `docs/process/git/preflights/AGSYS-214.env`
- Validation: PASS (`STATUS=APPROVED`, `EXECUTION_APPROVED=YES`)

## Checks
1. Frontend build
   - Command: `npm --prefix frontend run build`
   - Result: PASS

2. Backend API smoke
   - Commands:
     - `curl -i -sS http://127.0.0.1:3001/api/health`
     - `curl -i -sS http://127.0.0.1:3001/api/cockpit/providers`
   - Result: PASS (HTTP 200)
   - Verified capability contract keys:
     - `capabilities.effectiveMode`
     - `capabilities.selectedBackend`
     - `capabilities.supportsDirectProviderConfig`

## Runtime Note
- launchctl bootstrap was unstable in this environment; service verified via direct runtime session (`npm run backend:start`) for postflight smoke.

## Status
- Ready for review gate.
