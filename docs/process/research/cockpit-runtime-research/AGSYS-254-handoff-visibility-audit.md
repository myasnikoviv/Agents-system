# AGSYS-254 — Handoff Visibility Audit

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Handoff signaling currently implemented

### Backend/runtime events
- Stage start emits `stage.started` swarm event.
- Stage completion emits `swarm_stage_completed` with payload message.
- Evidence:
  - start emit: `src/runtime/graphs/PilotQuasiLinearGraph.ts:479-485`
  - completion emit: `src/runtime/graphs/PilotQuasiLinearGraph.ts:692-709`

### UI visibility path
- `stage.started` maps to chat line: `Swarm handoff ... started stage ...`
- `swarm_stage_completed` maps to stage message or generic completion line.
- Evidence: `frontend/src/components/cockpit/CockpitPage.tsx:530-540`

## 2) Verification scenarios (designed)
1. 2-agent chain scenario:
- ensure two distinct `stage.started` + two `swarm_stage_completed` events with same run/thread correlation.

2. 3-agent chain scenario:
- verify event ordering in SSE and chat propagation without missing middle handoff.

3. Status-chain scenario:
- verify sequence `status-chain-1..N` emits and displays per-agent status message.
- Evidence branch: `src/runtime/graphs/PilotQuasiLinearGraph.ts:339-407`

## 3) Gaps observed
1. Handoff is stage-centric, not explicit "responsibility transfer contract" object.
2. Chat feed mixes handoff technical lines and user-facing output.
3. No dedicated run timeline for deterministic handoff replay.

## 4) Event expectations matrix (initial)

| Step | Expected Event Type | Required Fields |
|---|---|---|
| Stage enter | `stage.started` | `pipeline_run_id`, `thread_id`, `agent_role`, `source_stage` |
| Stage done | `swarm_stage_completed` | `payload.stageId`, `payload.agentId`, `payload.message` |
| Run done | `run.completed` | `pipeline_run_id`, `thread_id`, `status` |

## 5) Stop condition
Research artifact only. No handoff visibility implementation changes performed.
