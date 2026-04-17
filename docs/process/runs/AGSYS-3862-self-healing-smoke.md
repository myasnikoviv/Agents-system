# AGSYS-3862 — Self-Healing Smoke Validation

## Date
2026-04-17

## Commands
```bash
npx jest --runInBand --roots packages/runtime/src/__tests__ --runTestsByPath \
  packages/runtime/src/__tests__/restart_policy_engine.test.ts \
  packages/runtime/src/__tests__/control_api_runtime_manager.test.ts

npx tsc -p packages/runtime/tsconfig.json --noEmit
```

## Result
- Jest: `2 passed, 2 total`; `7 passed, 7 total`.
- Type check: success (`noEmit`) for `packages/runtime`.

## Notes
- `control_api_runtime_manager.test.ts` now includes AGSYS-3862 scenario:
  - simulated service failure,
  - incident timeline row creation,
  - forensic artifact file creation,
  - auto-restart remediation status update.
