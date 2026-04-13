# Requirements Pack: AGSYS-3425 Fix /api/chat runtime timeout & worker lock instability

- **Ticket ID**: AGSYS-3425
- **Status**: In Progress
- **Priority**: High
- **Owner**: Developer (Кодоковаль)

## Context
The `/api/chat` endpoint is experiencing severe instability in the live E2E flow. Specifically, requests are exceeding the 120s/300s timeout thresholds, and worker locks appear to be staying "busy" or not releasing correctly, leading to cascading failures.

## Objectives
1. **Stabilize Worker Locks**: Ensure that `worker_lock_busy` is handled robustly and locks are always released, even on failure.
2. **Resolve Timeouts**: Identify the non-terminating code paths in the runtime that cause hangs >300s.
3. **Internal Fallbacks**: Refine the fallback mechanism to in-process execution if subprocesses fail or hang.
4. **Observability**: Add granular logging/tracing to the runtime path to capture where the "hang" occurs in live environments.

## Acceptance Criteria
1. [ ] `npx jest src/runtime/__tests__/multiple_agents_runtime.test.ts` passes consistently.
2. [ ] `/api/chat` endpoint returns a response within 60-120s under simulated load, or deterministically fails with a truthful error (not a hang).
3. [ ] All worker locks are verified released after request completion/abortion.
4. [ ] Trace evidence showing the termination of a previously hanging path.

## Dependencies
- Redis (for locking and queue management).
- MultipleAgentsRuntime (core logic).
- `/api/chat` route handler.
