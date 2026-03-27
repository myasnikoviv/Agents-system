# AGSYS-215 Postflight Smoke Report

- Ticket: `AGSYS-215`
- Date: `2026-03-27`
- Branch: `codex/AGSYS-215-configuration-ia-refactor`
- Worktree: `/Users/myasnikoviv/development/agent-system`

## Backend/API Smoke
- Status: PASS
- Command:
```bash
curl -sSf http://127.0.0.1:3001/api/cockpit/providers
```
- Observed result: endpoint returns `effectiveMode`, `selectedBackend`, and `supportsDirectProviderConfig`.

## Frontend Build Smoke
- Status: PASS
- Command:
```bash
npm --prefix frontend run build
```
- Observed result: TypeScript build and Vite production bundle complete successfully.

## UI Smoke (Playwright MCP)
- Status: N/A
- Reason: session focused on IA refactor + build/API verification; visual pass deferred to AGSYS-216/AGSYS-222 UI stream.

## Acceptance Notes
- Configuration screen is now mode-gated by effective runtime mode.
- In CLI-effective mode the UI emphasizes executor flow and avoids duplicate provider controls.
- In direct mode provider/model/key controls are available and persisted locally.
