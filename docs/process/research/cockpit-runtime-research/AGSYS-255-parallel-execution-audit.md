# AGSYS-255 — Parallel Execution Audit

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Objective
Verify whether `multiple_agents` currently performs true parallel branches or remains sequential in one graph path.

## 2) Confirmed runtime behavior from code
1. `multiple_agents` mode routes to same graph as `linear`.
- Evidence: `src/runtime/graphs/RuntimeExecutionRouter.ts:56-64`

2. Graph execution path is single-stage advancement loop (`swarm` node repeatedly).
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:727-732`, `798-799`

3. Stage execution invokes one `AgentExecutor.run(...)` call per selected next stage.
- Evidence: `src/runtime/graphs/PilotQuasiLinearGraph.ts:528-541`

## 3) Parallelism status (research conclusion)
- Confirmed in current graph path: sequential stage execution.
- Not confirmed from this implementation: simultaneous multiple branch execution from one run context.

## 4) Experimental plan for final confirmation
1. Instrument run with timestamps at stage start/complete.
2. Trigger workload requiring multiple developer-like branches.
3. Verify overlap windows in event stream (`events:runtime_hub`) for same run.
4. Compare with independent parallel threads (different run IDs) to avoid false positives.

## 5) Missing behavior table

| Capability | Current status |
|---|---|
| Multiple agents in registry/runtime board | Present |
| Sequential multi-stage handoff | Present |
| True parallel branches within single run | Not confirmed in code path |
| Per-branch independent state in one run | Not confirmed |

## 6) Stop condition
Research artifact only. No execution model refactor implemented.
