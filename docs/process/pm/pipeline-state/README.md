# Pipeline State Cards

This directory stores mandatory per-run pipeline state cards.

Naming:
- Prefer ticket id: `<TICKET>.md`
- If no ticket yet: `thread-<thread-id>.md`

These cards are required by `docs/process/pm/PIPELINE-STATE-CONTRACT.md`.

## Continuation
- Before `continue/продовжуємо`, run:
  - `bash scripts/pm/progress_router.sh <ticket-or-thread>`
- Router output is the mandatory source for next action.
