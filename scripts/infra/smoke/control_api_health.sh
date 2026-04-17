#!/usr/bin/env bash
set -euo pipefail

CONTROL_API_BASE_URL="${CONTROL_API_BASE_URL:-http://127.0.0.1:3001}"

echo "[smoke:control-api] base=${CONTROL_API_BASE_URL}"
curl -fsS "${CONTROL_API_BASE_URL}/api/health" | tee /tmp/agsys_smoke_control_health.json >/dev/null
curl -fsS "${CONTROL_API_BASE_URL}/api/health/readiness/dispatch" | tee /tmp/agsys_smoke_control_ready.json >/dev/null

jq -e '.success == true and (.status == "ok" or .status == "healthy")' /tmp/agsys_smoke_control_health.json >/dev/null
jq -e '(.success == true and .status == "ready") or (.status == "ready")' /tmp/agsys_smoke_control_ready.json >/dev/null

echo "[smoke:control-api] PASS"
echo "[smoke:control-api] /api/health => $(cat /tmp/agsys_smoke_control_health.json)"
echo "[smoke:control-api] /api/health/readiness/dispatch => $(cat /tmp/agsys_smoke_control_ready.json)"
