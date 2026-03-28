# AGSYS-239 Test Report

Date: 2026-03-28
Branch: codex/AGSYS-238-runtime-board-normalization

## Validation

1. Frontend build
- Command: `npm --prefix frontend run build`
- Result: PASS

2. Discovery smoke
- Command: `npx tsx src/runtime/__tests__/discovery_test.ts`
- Result: PASS

## Behavioral checks implemented
- Contract normalization strips prefixed prose and validates from first `Active role:` header.
- In `multiple_agents` mode, UI no longer appends API direct message to avoid duplicate final replies against SSE feed.
- Runtime board availability no longer flips to unavailable on formatting-only contract events.
- Right panel top cards are sticky and runtime board rows are sorted by status priority.
