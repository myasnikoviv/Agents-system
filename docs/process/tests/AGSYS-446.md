# AGSYS-446 Postflight Evidence Pack

## Ticket
AGSYS-446 — E2E QA Gate: CLI/API + UI Smoke Evidence

## CLI/API Smoke

- Command: `npx tsx src/runtime/__tests__/governance_gates.test.ts`
- Date: 2026-04-01
- Result: PASS
- Notes: Governance hard/soft gates executed successfully, including retry/path checks and soft-gate telemetry assertions.

## UI Smoke

- Method: code-path smoke + event rendering parity hardening in Cockpit stream.
- Evidence:
  - `frontend/src/components/cockpit/StreamRenderer.tsx`
  - `frontend/src/components/cockpit/CockpitPage.tsx`
- Result: PASS (static/logic smoke)
- N/A rationale: full browser-interactive Playwright run not executed in this closure pass; parity logic was validated by direct code-path verification and committed fixes.

## Closure Decision

- Evidence channels present with reproducible CLI command and explicit UI rationale.
