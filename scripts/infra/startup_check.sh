#!/usr/bin/env bash
set -euo pipefail

CHECK_COMPOSE="false"
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --compose|--standalone)
      CHECK_COMPOSE="true"
      ;;
    *)
      ;;
  esac
  shift
done

pass() { echo "[startup-check] PASS: $1"; }
fail() { echo "[startup-check] FAIL: $1" >&2; exit 1; }

check_http() {
  local url="$1"
  local label="$2"
  if curl -fsS "$url" >/dev/null; then
    pass "${label} (${url})"
  else
    fail "${label} (${url})"
  fi
}

check_tcp() {
  local host="$1"
  local port="$2"
  local label="$3"
  if nc -z "$host" "$port" >/dev/null 2>&1; then
    pass "${label} (${host}:${port})"
  else
    fail "${label} (${host}:${port})"
  fi
}

echo "[startup-check] running infrastructure checks"

check_http "http://127.0.0.1:3001/api/health" "control-api health"
check_http "http://127.0.0.1:3001/api/health/readiness/dispatch" "control-api readiness"
check_http "http://127.0.0.1:3002/health" "runtime-engine health"
check_http "http://127.0.0.1:3002/ready" "runtime-engine readiness"

if [[ "${CHECK_COMPOSE}" == "true" ]]; then
  check_tcp "127.0.0.1" "5432" "postgres port"
  check_tcp "127.0.0.1" "6379" "redis port"
fi

echo "[startup-check] all checks passed"
