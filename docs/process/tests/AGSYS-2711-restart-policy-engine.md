# AGSYS-2711 — Restart Policy Engine

## Scope
Implemented restart policy decision engine for control plane.

## Implementation
- `src/runtime/control-plane/RestartPolicyEngine.ts`
  - restart-on-failure decisioning.
  - configurable max retries.
  - basic exponential backoff calculation.
  - restart-loop detection via bounded time window + threshold.
- `src/runtime/__tests__/restart_policy_engine.test.ts`
  - covers restart allowance, max retries, backoff growth, loop detection.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/restart_policy_engine.test.ts src/runtime/__tests__/health_check_system.test.ts
```

Result:
- 2 suites passed
- 8 tests passed

## Acceptance Mapping
- restart on failure: yes
- max retries configurable: yes
- exponential backoff (basic): yes
- restart loops detected: yes
