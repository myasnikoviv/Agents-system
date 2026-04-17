#!/usr/bin/env bash
set -euo pipefail

RUNTIME_ENGINE_BASE_URL="${RUNTIME_ENGINE_BASE_URL:-http://127.0.0.1:3002}"

echo "[smoke:runtime] base=${RUNTIME_ENGINE_BASE_URL}"
curl -fsS "${RUNTIME_ENGINE_BASE_URL}/health" | tee /tmp/agsys_smoke_runtime_health.json >/dev/null
curl -fsS "${RUNTIME_ENGINE_BASE_URL}/ready" | tee /tmp/agsys_smoke_runtime_ready.json >/dev/null

PAYLOAD='{"runId":"smoke-run-001","projectId":"smoke-project","chainId":"smoke-chain","agentId":"smoke-agent","input":{"message":"smoke"}}'
curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" \
  "${RUNTIME_ENGINE_BASE_URL}/api/runtime/execute" | tee /tmp/agsys_smoke_runtime_dispatch.json >/dev/null

jq -e '.status == "healthy" or .status == "ok"' /tmp/agsys_smoke_runtime_health.json >/dev/null
jq -e '.status == "ready"' /tmp/agsys_smoke_runtime_ready.json >/dev/null
jq -e '.status == "dispatched" and .runId == "smoke-run-001"' /tmp/agsys_smoke_runtime_dispatch.json >/dev/null

echo "[smoke:runtime] PASS"
echo "[smoke:runtime] /health => $(cat /tmp/agsys_smoke_runtime_health.json)"
echo "[smoke:runtime] /ready => $(cat /tmp/agsys_smoke_runtime_ready.json)"
echo "[smoke:runtime] /api/runtime/execute => $(cat /tmp/agsys_smoke_runtime_dispatch.json)"
