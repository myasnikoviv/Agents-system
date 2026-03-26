# AGSYS-231 Assumptions Review

## Ticket
- ID: `AGSYS-231`
- Pipeline: `bug-fix`

## Assumptions
1. Primary production blocker is local backend availability (`3001`) behind Vite proxy (`5174`).
2. UI drift (wrong provider/model) is caused by hardcoded frontend presets and non-persistent backend runtime state.
3. OpenHands "unreachable" can be caused by hardcoded backend health response and/or sidecar startup issues.
4. Modal rendering regression is caused by relying on Tailwind utility classes in a screen not guaranteed to apply them.

## Validation
- Confirmed repeated `502` only when backend unavailable.
- Confirmed stale provider/model UI from hardcoded presets.
- Confirmed OpenHands health endpoint was previously hardcoded to negative response.
- Confirmed modal was rendered as plain block text due to missing effective utility styles.

## Corrections Applied
- Backend lifecycle hardened and launchctl domain handling fixed.
- Runtime provider/model moved to backend source-of-truth with persisted settings.
- OpenHands health wired to actual sidecar `/health`.
- Modals converted to explicit Cockpit CSS classes.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-26
