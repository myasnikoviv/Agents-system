# AGSYS-2717 — Crash Recovery Scenario

## Scope
Validated crash recovery flow for service failure and controlled restart.

## Validation Scenario
- Simulated service kill (`status=failed`, reason `killed_by_signal`).
- Restart policy decision evaluated for restart allowance.
- Restart executed and state transitioned to healthy.
- State persistence verified after control-plane reinitialization.

## Evidence
- `src/runtime/__tests__/crash_recovery_scenario.test.ts`

## Result
- service kill -> restart: pass
- state not lost: pass
- restart visible: pass (`restartCount=1`)
- no infinite loop: pass (loop detector not triggered)
