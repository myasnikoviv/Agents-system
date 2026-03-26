# AGSYS-231 Test/Verification Report

## Channels
- CLI/API smoke: PASS
- UI smoke (user-reported + local verification): PASS with intermittent regressions resolved by final launchctl domain fix

## CLI/API Checks
- `GET /api/health` (3001): `200`
- `GET /api/cockpit/catalog` (3001): `200`
- `GET /api/cockpit/catalog` via 5174 proxy: `200`
- `GET /api/events/stream` (3001): `200` (stream)
- `GET /api/events/stream` via 5174 proxy: `200` (stream)
- `GET /api/cockpit/providers/openhands/health`: reflects real sidecar health

## Functional Checks
- Provider/model displayed from runtime source-of-truth.
- Executor settings persisted across backend restart.
- Project/chain creation dialogs open as centered modal overlays.

## Notes
- LangSmith onboarding/account permission `403` is external and not part of this local runtime gate.
