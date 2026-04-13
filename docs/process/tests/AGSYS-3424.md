# AGSYS-3424 — E2E Evidence Pack (Isolation + UI Truthfulness)

Date: 2026-04-12
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Build reproducible evidence pack for:
  - tenant/workspace isolation
  - UI runtime truthfulness contracts
  - live `/api/chat` behavior in `linear` and `multiple_agents` modes

## A) Isolation + UI Truthfulness (Automated Evidence)
Command:
```bash
npx jest --runInBand \
  src/runtime/__tests__/telemetry_tracing_endpoint.test.ts \
  src/runtime/__tests__/telemetry_metrics_overview.test.ts \
  src/runtime/__tests__/telemetry_alerts_endpoint.test.ts \
  src/runtime/__tests__/telemetry_slo_status.test.ts \
  src/runtime/__tests__/abac_layer.test.ts \
  src/runtime/__tests__/secrets_store.test.ts
```

Result:
- PASS: 6/6 suites, 7/7 tests.

Coverage delivered:
- Runtime telemetry APIs used by Cockpit runtime board/feed are verified.
- ABAC tenant/workspace access boundaries are verified.
- Secrets storage tenant/workspace isolation is verified.

## B) Live `/api/chat` Evidence (Real Endpoint)
Health check:
```bash
curl -sS http://127.0.0.1:3001/api/health
```
- PASS (`success=true`).

Chat-flow script:
```bash
npm run verify:chat-flow
```
- FAIL: `HTTP 500 for POST http://127.0.0.1:3001/api/chat`

Manual reproductions:
```bash
curl -sS -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"default","threadId":"thread_3424_debug_2","executionMode":"multiple_agents","ticketId":"AGSYS-3424","message":"hello"}'
```
- Observed: `{"success":false,"error":"internal_error","message":"worker_lock_busy:..."}`

After worker state reset:
```bash
npx tsx -e "import { DynamicWorkerSpawnManager } from './src/runtime/workers/DynamicWorkerSpawnManager'; (async()=>{ await DynamicWorkerSpawnManager.clearAsync(); console.log('CLEARED_WORKER_STATE=true'); })().catch((e)=>{ console.error(e); process.exit(1); });"
```

Repeated chat call:
- Observed: `{"success":false,"error":"internal_error","message":"worker_subprocess_timeout:60000"}`

Timeout hardening applied in runtime graphs and backend restarted; repeated call:
- Observed: `{"success":false,"error":"internal_error","message":"worker_subprocess_timeout:300000"}`

Interpretation:
- Timeout ceiling is now correctly applied (from 60s to 300s), but live chat still times out waiting for subprocess completion.
- This is a reproducible runtime blocker, not a flaky one-off.

## Conclusion
- Evidence pack is partially complete:
  - Isolation and UI truthfulness contract evidence: complete (automated, green).
  - Live end-to-end `/api/chat` flow evidence: reproducible blocker captured with concrete outputs.

## Next Action
- Open/track dedicated blocker ticket for `/api/chat` runtime timeout path and complete remediation before closing AGSYS-3424.
