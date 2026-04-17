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
  local attempts="${3:-20}"
  local sleep_s="${4:-1}"
  local i=1
  while [[ "${i}" -le "${attempts}" ]]; do
    if curl -fsS "$url" >/dev/null; then
      pass "${label} (${url})"
      return
    fi
    sleep "${sleep_s}"
    i=$((i + 1))
  done
  fail "${label} (${url})"
}

check_control_readiness() {
  local readiness_url="http://127.0.0.1:3001/api/health/readiness/dispatch"
  local health_url="http://127.0.0.1:3001/api/health"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" "${readiness_url}" || true)"
  if [[ "${status}" == "200" ]]; then
    pass "control-api readiness (${readiness_url})"
    return
  fi
  if [[ "${status}" == "404" ]]; then
    # Some local profiles expose only /api/health.
    check_http "${health_url}" "control-api readiness fallback (${health_url})"
    return
  fi
  fail "control-api readiness (${readiness_url})"
}

check_tcp() {
  local host="$1"
  local port="$2"
  local label="$3"
  local attempts="${4:-20}"
  local sleep_s="${5:-1}"
  local i=1
  while [[ "${i}" -le "${attempts}" ]]; do
    if nc -z "$host" "$port" >/dev/null 2>&1; then
      pass "${label} (${host}:${port})"
      return
    fi
    sleep "${sleep_s}"
    i=$((i + 1))
  done
  fail "${label} (${host}:${port})"
}

echo "[startup-check] running infrastructure checks"

check_http "http://127.0.0.1:3001/api/health" "control-api health"
check_control_readiness
check_http "http://127.0.0.1:3002/health" "runtime-engine health"
check_http "http://127.0.0.1:3002/ready" "runtime-engine readiness"

if [[ "${CHECK_COMPOSE}" == "true" ]]; then
  check_tcp "127.0.0.1" "5432" "postgres port"
  check_tcp "127.0.0.1" "6379" "redis port"
fi

echo "[startup-check] all checks passed"
