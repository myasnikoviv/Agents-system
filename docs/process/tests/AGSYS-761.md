# AGSYS-761 — Smart Retry Policy (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- No blind retry for expensive operations
- Error classification based retry decisions
- Selective retry policy

## Changes
- Added smart retry policy engine:
  - `src/runtime/optimization/SmartRetryPolicy.ts`
  - error classes:
    - `transient`
    - `rate_limited`
    - `timeout`
    - `quota`
    - `auth`
    - `validation`
    - `unknown`
  - configurable policy:
    - `docs/runtime/adaptive/smart-retry-policy.json`
    - `retryableClasses`
    - `maxExpensiveRetryTokens`
- Integrated into execution loop:
  - `src/runtime/NativeToolLoopRunner.ts`
  - before retry increment, evaluate smart-retry decision
  - non-retryable or too-expensive failure returns immediately (no blind retry)

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/smart_retry_policy.test.ts src/runtime/__tests__/routing_policies.test.ts
```
Result:
- Pass (2 suites, 3 tests).

2. Verified outcomes:
- retry happens only for allowed transient/rate-limit/timeout classes
- validation/auth/quota classes are blocked from retry by default policy
- expensive retries are blocked by token threshold guard
