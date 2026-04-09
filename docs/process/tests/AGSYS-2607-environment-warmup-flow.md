# AGSYS-2607 — Environment Warmup Flow

## Scope
- Warmup step transitions environment to `warming` and then `active`
- Warmup failures transition to `failed` with explicit error
- Warmup outcomes are visible in API payload + control action audit

## Automated checks
- `npx jest --runInBand src/runtime/__tests__/environment_warmup_service.test.ts`

## API smoke (local)
- `POST /api/cockpit/environments/warmup`
- Expected:
  - `success=true` for healthy checks
  - `checks[]` includes `catalog_refresh`, `executor_config`, `storage_backends`
  - `durationMs` and `environment.state=active`

## Evidence summary
- Warmup endpoint returns structured per-check telemetry
- On failed check, endpoint returns `environment_warmup_failed` + `state=failed`
