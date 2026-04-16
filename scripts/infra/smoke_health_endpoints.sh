#!/usr/bin/env bash
set -euo pipefail

CONTROL_API_BASE_URL="${CONTROL_API_BASE_URL:-http://127.0.0.1:3001}"
RUNTIME_ENGINE_BASE_URL="${RUNTIME_ENGINE_BASE_URL:-}"

echo "[health-smoke] control-api: ${CONTROL_API_BASE_URL}"
curl -fsS "${CONTROL_API_BASE_URL}/api/health" | tee /tmp/agsys_3812_control_health.json >/dev/null
curl -fsS "${CONTROL_API_BASE_URL}/api/health/readiness/dispatch" | tee /tmp/agsys_3812_control_ready.json >/dev/null

if [[ -n "${RUNTIME_ENGINE_BASE_URL}" ]]; then
  echo "[health-smoke] runtime-engine: ${RUNTIME_ENGINE_BASE_URL}"
  curl -fsS "${RUNTIME_ENGINE_BASE_URL}/health" | tee /tmp/agsys_3812_runtime_health.json >/dev/null
  curl -fsS "${RUNTIME_ENGINE_BASE_URL}/ready" | tee /tmp/agsys_3812_runtime_ready.json >/dev/null
fi

echo "[health-smoke] PASS"
echo "[health-smoke] control health: $(cat /tmp/agsys_3812_control_health.json)"
echo "[health-smoke] control ready : $(cat /tmp/agsys_3812_control_ready.json)"
if [[ -n "${RUNTIME_ENGINE_BASE_URL}" ]]; then
  echo "[health-smoke] runtime health: $(cat /tmp/agsys_3812_runtime_health.json)"
  echo "[health-smoke] runtime ready : $(cat /tmp/agsys_3812_runtime_ready.json)"
fi
