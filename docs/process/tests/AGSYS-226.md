# AGSYS-226 Postflight Smoke Report

## Ticket
- ID: `AGSYS-226`
- Pipeline: `refactor`
- Branch: `codex/AGSYS-226-cockpit-observability-closure`

## Checks
1. Cockpit observability UI trace
   - File: `frontend/src/components/cockpit/CockpitPage.tsx`
   - Result: PASS
   - Observed:
     - `observability` state + observability card rendering (`Pipeline/Stage/Next/Gates/Approval`)
     - runtime event ingestion (`eventsByThread`) updates live runtime state
     - swarm lifecycle messages propagated to chat on `stage.started`/`swarm_stage_completed`

2. Runtime event contract trace
   - Files: `src/runtime/events/EventBus.ts`, `src/runtime/graphs/PilotQuasiLinearGraph.ts`
   - Result: PASS
   - Observed:
     - event schema includes `agent_role`, `source_stage`, `payload.stageId`
     - stage lifecycle emission includes `stage.started` and `run.completed`

3. Discovery sanity
   - Command: `npx tsx src/runtime/__tests__/discovery_test.ts`
   - Result: PASS

## Status
- Ready for reviewer gate.
