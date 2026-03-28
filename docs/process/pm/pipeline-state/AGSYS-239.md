# AGSYS-239 Pipeline State

- Pipeline: bug-fix
- Stage: implementation
- Status: in_progress
- Approved by: user
- Date: 2026-03-28

## Scope
- Normalize contract responses so `Active role:` starts response body.
- Remove duplicate assistant output in `multiple_agents` mode caused by API+SSE overlap.
- Prevent false `unavailable` transitions for formatting-only contract events.
- Make right panel top summary sticky and sort runtime board statuses: unavailable -> active -> standby.
