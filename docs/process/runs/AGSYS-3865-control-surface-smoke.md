# AGSYS-3865 — Control Surface Smoke

## Date
2026-04-17

## Validation commands
```bash
npx tsc -p packages/runtime/tsconfig.json --noEmit
npx tsc -p apps/control-api/tsconfig.json --noEmit
npx jest --runInBand --roots packages/runtime/src/__tests__ --runTestsByPath \
  packages/runtime/src/__tests__/control_api_runtime_manager.test.ts
```

## Result
- Runtime typecheck: passed.
- Control API typecheck: passed.
- Control API runtime manager tests: passed (includes AGSYS-3865 manual restart guard test).
