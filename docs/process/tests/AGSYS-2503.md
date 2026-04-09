# AGSYS-2503 Test Report — Durable Queue

## Automated
Command:
`npx jest --runInBand src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/multi_node_simulation.test.ts`

Result:
- Test Suites: 2 passed, 2 total
- Tests: 10 passed, 10 total

## Acceptance Mapping
- crash recovery / durable store: PASS (SQLite-backed queue)
- cross-process visibility: PASS (multi-process simulation)
- deterministic semantics: PASS (priority/order/reassign/retry/cancel tests)
