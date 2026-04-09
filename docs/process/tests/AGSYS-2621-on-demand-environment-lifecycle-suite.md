# AGSYS-2621 — On-Demand Environment Lifecycle Test Suite

Date: 2026-04-09

## Scope
Validate lifecycle transitions:
- provision
- warm
- active
- idle
- suspend
- resume
- terminate

## Executed Test Command
```bash
npx jest --runInBand \
  src/runtime/__tests__/runtime_domain_model.test.ts \
  src/runtime/__tests__/environment_state_store.test.ts \
  src/runtime/__tests__/environment_provisioning_service.test.ts \
  src/runtime/__tests__/environment_warmup_service.test.ts \
  src/runtime/__tests__/environment_suspend_resume_service.test.ts \
  src/runtime/__tests__/environment_lifecycle.test.ts \
  src/runtime/__tests__/runtime_infrastructure_profile.test.ts
```

## Result
- Test Suites: `7 passed, 7 total`
- Tests: `20 passed, 20 total`
- Exit code: `0`

## Coverage Mapping
- Provision path: `environment_provisioning_service.test.ts`
- Warmup path: `environment_warmup_service.test.ts`
- Suspend/Resume: `environment_suspend_resume_service.test.ts`
- Lifecycle transitions including terminate: `environment_lifecycle.test.ts`
- Domain state model (active/idle semantics): `runtime_domain_model.test.ts`
- State persistence behavior: `environment_state_store.test.ts`

## Recovery / Failure Scenarios
- Failed provisioning behavior: covered in provisioning service tests and lifecycle guard tests.
- Recovery transitions (suspend -> resume, state reconciliation): covered in suspend/resume and lifecycle tests.

## Logs and Metrics
- Lifecycle telemetry evidence captured in Sprint artifacts for AGSYS-2618 and AGSYS-2620 validation summary.

## Conclusion
AGSYS-2621 acceptance criteria are satisfied.
