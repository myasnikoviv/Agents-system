# AGSYS-2712 — Failure Detection & Classification

## Scope
Implemented failure classification and telemetry-ready reason logging, integrated with restart policy decisioning.

## Implementation
- `src/runtime/control-plane/FailureClassifier.ts`
  - classifies failure kind: `crash | degraded | timeout | none`.
  - emits telemetry payload containing `serviceId`, `kind`, `reason`, `timestamp`.
  - in-memory telemetry buffer for visibility.
- `src/runtime/control-plane/RestartPolicyEngine.ts`
  - consumes optional failure classification in restart decision logic.
- `src/runtime/__tests__/failure_classifier.test.ts`
  - validates classification, reason logging, and restart integration.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/failure_classifier.test.ts src/runtime/__tests__/restart_policy_engine.test.ts
```

Result:
- 2 suites passed
- 7 tests passed

## Acceptance Mapping
- crash vs degraded vs timeout: yes
- failure reason logged: yes
- classification used in restart logic: yes
- visible in telemetry: yes (telemetry payload + buffer)
