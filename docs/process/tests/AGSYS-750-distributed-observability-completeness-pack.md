# AGSYS-750 — Distributed Observability Completeness Pack

## Objective
Close Sprint 32.2 Section 8 gap by proving:
- complete distributed execution trace chain
- real worker/queue/failure/latency metric surfaces
- runtime truth source mapping to Cockpit APIs

## Executed Validation

1) Trace chain endpoint
- Command: `npx jest src/runtime/__tests__/telemetry_tracing_endpoint.test.ts --runInBand`
- Result: 1/1 passed

2) Metrics overview endpoint
- Command: `npx jest src/runtime/__tests__/telemetry_metrics_overview.test.ts --runInBand`
- Result: 1/1 passed

3) Alerts snapshot endpoint
- Command: `npx jest src/runtime/__tests__/telemetry_alerts_endpoint.test.ts --runInBand`
- Result: 1/1 passed

4) SLO status endpoint
- Command: `npx jest src/runtime/__tests__/telemetry_slo_status.test.ts --runInBand`
- Result: 1/1 passed

5) Worker utilization metrics
- Command: `npx jest src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts --runInBand -t "collects utilization metrics"`
- Result: target test passed (1 passed, 22 skipped)

## Runtime Truth Mapping

### Event chain and hop visibility
Sources:
- `src/runtime/graphs/UnifiedSwarmPipelineGraph.ts`
- `src/runtime/graphs/MultipleAgentsRuntime.ts`
- `src/runtime/events/types.ts`

Observed emitted chain coverage:
- queue hop: `task.queued`, `task.dispatched`
- execution hop: `agent.started`, `agent.completed`, `agent.failed`
- worker hop: `worker.spawned`, `worker.state_changed`, `worker.heartbeat`, `worker.unhealthy`
- system/runtime decisions: `system.thought`

Implication:
- distributed hops are represented by typed runtime events, not synthetic UI-only statuses.

### Trace APIs and projections
Source:
- `src/server/routes/telemetryRoutes.ts`

Endpoints:
- `/api/cockpit/telemetry/runs/:runId/trace` (stage/tool/guard slices + duration)
- `/api/cockpit/telemetry/traces` (api spans + runtime events)
- `/api/cockpit/telemetry/unified` (merged runtime + audit feed)

Implication:
- hop-level execution timeline is queryable and composable for runtime analysis.

### Worker/queue metrics truth sources
Sources:
- `src/server/agentSystemBackend.ts` (`/api/cockpit/environments/status`, `/api/cockpit/environments/telemetry`)
- `src/runtime/workers/DynamicWorkerSpawnManager.ts` (`controllerContractSnapshot`, `utilizationSnapshot`, `healthSnapshot`)
- `src/runtime/queue/ProjectDispatchQueue.ts` (`snapshotAsync`)

Mapped metrics:
- worker load/state/heartbeat freshness from worker snapshots
- queue pressure/depth from queue snapshot aggregation
- environment telemetry metrics (`totalEvents`, `coldStartLatencyMs`, `failureCount`)
- trace durations and event counts from telemetry routes

## Conclusion
Section 8 observability requirements are satisfied with reproducible evidence:
- end-to-end trace chain is exposed via telemetry APIs
- worker/queue/failure/latency metrics are backed by runtime stores
- Cockpit telemetry endpoints are contract-bound to those runtime truth sources

Residual note:
- selected Jest runs may emit open-handle warnings after completion; assertions are green and evidence remains valid.
