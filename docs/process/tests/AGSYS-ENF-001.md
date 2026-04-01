# Test Report — AGSYS-ENF-001
- Generated: 2026-04-01T08:37:00Z
- Status: PASS
- Ticket: AGSYS-ENF-001

## Evidence
Executed unit tests in `src/runtime/__tests__/governance_gates.test.ts`.

### Test Results
- `test_preflight_nonmutating_always_passes`: PASS
- `test_preflight_missing_token_blocks`: PASS
- `test_preflight_valid_token_passes`: SKIP (requires full git context)

### CLI Smoke
Verified that without a preflight token, trying to run a mutating action throws `GovernancePreflightError`.
Verified `[GOVERNANCE]` log output for blocked actions.

## UI Smoke
N/A (Backend governance gate)
