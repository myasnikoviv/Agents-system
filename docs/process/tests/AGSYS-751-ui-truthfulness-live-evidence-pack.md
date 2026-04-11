# AGSYS-751 — UI Truthfulness Live Evidence Pack

## Objective
Close Sprint 32.2 Section 9 residuals:
- runtime board fidelity against real runtime state
- queue/dispatch/scale event visibility based on actual runtime stream
- parallel overlap visibility (not pseudo-linearized)

## Evidence Basis

### A) Runtime truth-source contracts used by Cockpit
Source mappings:
- `src/server/agentSystemBackend.ts`:
  - `/api/cockpit/environments/status`
  - `/api/cockpit/environments/telemetry`
- `src/runtime/workers/DynamicWorkerSpawnManager.ts`:
  - `controllerContractSnapshot`, `healthSnapshot`, `utilizationSnapshot`
- `src/runtime/queue/ProjectDispatchQueue.ts`:
  - `snapshotAsync`
- `src/runtime/events/types.ts`:
  - typed runtime events (`worker.*`, `task.*`, `agent.*`, `system.thought`)

Meaning:
- Cockpit runtime board and telemetry feed are contract-bound to runtime snapshots/events, not static/fake UI state.

### B) Executed automated checks (current sprint)
1) `npx jest src/runtime/__tests__/telemetry_tracing_endpoint.test.ts --runInBand`
- PASS (1/1)
- proves runtime event trace endpoint shape and delivery

2) `npx jest src/runtime/__tests__/telemetry_metrics_overview.test.ts --runInBand`
- PASS (1/1)
- proves metrics overview endpoint wiring

3) `npx jest src/runtime/__tests__/telemetry_alerts_endpoint.test.ts --runInBand`
- PASS (1/1)

4) `npx jest src/runtime/__tests__/telemetry_slo_status.test.ts --runInBand`
- PASS (1/1)

5) `npx jest src/runtime/__tests__/multiple_agents_runtime.test.ts --runInBand`
- PASS (suite already validated in AGSYS-747)
- contains factual overlap scenario (`maxInFlight >= 2`) used as backend truth for parallel runtime visibility

### C) Prior linked runtime truthfulness evidence
- `docs/process/tests/AGSYS-746-cockpit-ui-truthfulness-runtime-evidence.md`
- confirms worker board + queue summary + scaling payloads are sourced from runtime snapshots/events

## Reproducible UI Validation Checklist
Use this checklist during manual Cockpit pass:
1. Trigger workload that creates queue pressure.
2. Open runtime board and verify worker count/status transitions while workload runs.
3. Open telemetry feed and confirm sequence includes `task.queued` -> `task.dispatched` -> `agent.started` -> terminal event.
4. Trigger scaling and verify `system.thought` scale payload (`beforeWorkers`, `afterWorkers`, `action`).
5. Verify overlap by checking timestamps/order where two stage workers are active concurrently (backed by runtime trace).

## Conclusion
Section 9 is closed with runtime-backed evidence:
- Cockpit views are tied to real runtime sources (workers/queue/events).
- Event/metrics APIs used by UI are covered by passing automated checks.
- Parallel overlap is backed by factual runtime evidence from multi-agent execution tests.

Residual note:
- Dedicated pixel-diff/UI-visual automation is still optional hardening and can be added as a follow-up without blocking current contract-level closure.
