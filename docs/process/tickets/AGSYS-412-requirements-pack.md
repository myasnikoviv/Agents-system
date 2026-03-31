# Requirements Pack: AGSYS-412 (Auto-Retry Loop)

## Objective
Implement the logic to automatically retry failed tasks up to a configured limit.

## Acceptable Criteria
1. `GovernanceLoopEngine` detects `VerificationReport` with `status: 'failed'`.
2. Logic to increment `autoRetryCount` on the `Task`.
3. If `autoRetryCount < MAX_RETRIES` (default 3), reset `Task.status` to `pending` and re-queue.
4. If `autoRetryCount >= MAX_RETRIES`, set `Task.status` to `blocked` and trigger `notify_user`.

## Verification
- Unit test for the retry counter and state reset.
- Simulated 3x failure leading to a 'Blocked' state.
