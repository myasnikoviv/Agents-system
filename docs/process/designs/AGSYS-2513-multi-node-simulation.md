# AGSYS-2513 — Multi-Node Simulation Test

## Goal
Validate that queue dispatch and worker lifecycle state behave correctly across independent runtime processes (node simulation).

## Implemented
- Added cross-process simulation test:
  - `src/runtime/__tests__/multi_node_simulation.test.ts`
- Test executes independent TSX processes and validates:
  - shared queue semantics across processes (`ProjectDispatchQueue` SQLite backend)
  - shared worker state visibility across processes (`DynamicWorkerSpawnManager` SQLite backend)

## Why this closes the gap
The test is process-boundary aware (separate Node processes), proving persistence and retrieval are not relying on a single-process memory map.
