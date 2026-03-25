# AGSYS-29 — Cockpit Analytics Integration

## Context / Problem
Skill telemetry data exists in runtime/backend but is not visible in cockpit UI for operators.

## Scope
- Add cockpit usage analytics panel for skills telemetry.
- Add backend analytics endpoint wiring required by the panel.
- Show actionable slices: by skill, by role, by pipeline, and unused skills.

## Acceptance Criteria
- Settings → Usage includes a telemetry analytics panel.
- Panel can refresh and render latest summary from API.
- Backend endpoint returns structured summary payload for cockpit.

## Expected Pipeline
- `pipeline=feature-change`
- stages: intake -> implementation -> qa -> review -> git -> docs

## Gate
- Frontend build/test for touched cockpit component passes.
- API smoke returns success payload for skills analytics endpoint.
- Plane issue contains evidence with commit and verification outputs.

