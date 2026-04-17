# AGSYS-3862 — Control API Self-Healing and Crash Forensics Runbook

## What is implemented
- Deterministic restart/backoff policy is enforced in `ControlApiRuntimeManager` via `RestartPolicyEngine`.
- Every `failed/crashed/degraded` runtime detection creates a crash forensic artifact (`.agent-system/control-api-crash-artifacts/*.json`).
- Incident timeline is persisted and queryable through:
  - `GET /api/system/control-api/incidents`
  - `GET /api/system/control-api/incidents/:incidentId`

## Operational flow
1. Service runtime enters `failed/crashed/degraded`.
2. Control API computes restart decision (`mode`, `maxRetries`, exponential `backoffMs`, loop detection).
3. Incident row is appended to `.agent-system/control-api-incidents.jsonl`.
4. Forensic artifact is written with runtime snapshot + policy decision.
5. If allowed, restart is scheduled and outcome is recorded (`restarted` / `restart_failed`).

## Validation command
```bash
npx jest --runInBand packages/runtime/src/__tests__/restart_policy_engine.test.ts packages/runtime/src/__tests__/control_api_runtime_manager.test.ts
```

## Failure simulation checks
- Simulate `failed` status in adapter runtime.
- Confirm non-empty `/api/system/control-api/incidents`.
- Confirm `artifactPath` exists on disk.
- Confirm `remediationStatus` transitions from `scheduled` to `restarted` or `restart_failed`.
