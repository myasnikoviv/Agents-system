# AGSYS-610 Test Report

- Ticket: AGSYS-610
- Date: 2026-04-09
- Branch: `codex/s19-runtime-remediation`

## Automated checks
1. `npm test -- postgres_control_plane_store.test.ts`
- Result: PASS
- Notes: includes disabled-mode checks for new read APIs (`getState`, `getSetting`, `listSettings`).

2. `npm run test:scenarios`
- Result: PASS
- Suites: dynamic pipeline executor, run ledger, workbench scheduler.

## Behavioral validation
1. Boot sequence now performs Postgres hydration before server listen.
2. Health payload now exposes source/default metadata:
- `controlPlane.sourceOfTruth`
- `controlPlane.settingsSource`
- `controlPlane.runtimeStateSources`
- `controlPlane.default`
- `controlPlane.postgres`
- `controlPlane.lastHydratedAt` (when hydrated)

## Regression risk
- Low/Medium: boot now includes async hydration step, but default remains SQLite when Postgres is unavailable.
