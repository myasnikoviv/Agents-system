# TRADE-117 QA Matrix Extension: Scope Hierarchy + Selector + Status Board

Date: 2026-03-20
Owner: Ловець Багів (TDD QA)
Branch: codex/TRADE-113-postflight-recovery

## Scope
Validate Sprint 3 cockpit additions:
- Scope selector in header (`All / Sprint / Story / Task`)
- Work Scope panel (Sprint/Story filters + status counters)
- Backend work-scope API contract

## CLI / API Postflight

### Environment
- Local backend started via `npm run server`
- Runtime bound to `http://127.0.0.1:3001` (port 3000 occupied by local Plane)

### Checks
1. `GET /api/health`
- Result: PASS
- Response: `{"status":"ok","timestamp":"2026-03-19T23:49:15.134Z"}`

2. `GET /api/cockpit/work-scope?mode=all`
- Result: PASS
- Response contract includes: `success`, `mode`, `selected`, `cycles`, `stories`, `tasks`, `items`, `statusSummary`
- Verified non-empty `cycles` list and correct status summary shape.

3. `POST /api/chat` (mock path sanity)
- Payload: `{ "message": "health check", "mode": "mock" }`
- Result: PASS
- Response includes pipeline orchestration fields (`selectedPipeline`, `status`, `logs`).

## UI Postflight (Playwright MCP)

### Environment
- Frontend started via `cd frontend && npm run dev:cockpit -- --host 127.0.0.1`
- URL: `http://127.0.0.1:5174/cockpit`

### Checks
1. Header scope selector visible with options:
- `All`, `Sprint`, `Story`, `Task`
- Result: PASS

2. Work Scope panel rendered with controls:
- Sprint dropdown
- Story dropdown
- Status counters (`Total`, `Done`, `In Progress`, `Todo`)
- Result: PASS

3. Sprint options hydrated from backend:
- Includes `Cockpit Productization Sprint 3 (2026-04-03..2026-04-16)`
- Result: PASS

4. Runtime event feed still updates during run:
- Observed `pipeline.intake.started` and downstream stage completion events
- Result: PASS

## Notes / Risks
- Global `npm test` fails on existing unrelated hardening rule (`src/core/v2/GraphFunnelCollector.ts` exceeds max lines).
- This is outside TRADE-117 scope and does not invalidate scope selector/work-scope features.

## Verdict
TRADE-117 acceptance checks for CLI/API and UI postflight are PASS for implemented Sprint 3 scope features.
