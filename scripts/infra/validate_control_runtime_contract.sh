#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-local-self-hosted}"
PROFILE_FILE="${ROOT_DIR}/config/runtime-profiles/${PROFILE}.env"
COMPOSE_FILE="${ROOT_DIR}/infra/compose/runtime.yml"

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "[contract-check] FAIL: profile not found: ${PROFILE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[contract-check] FAIL: compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

set -a
source "${PROFILE_FILE}"
set +a

fail() {
  echo "[contract-check] FAIL: $1" >&2
  exit 1
}

assert_eq() {
  local key="$1"
  local expected="$2"
  local actual="${!key:-}"
  [[ "${actual}" == "${expected}" ]] || fail "${key} must be '${expected}' (got '${actual:-<empty>}')"
}

service_block() {
  local service="$1"
  awk -v service="^  ${service}:" '
    $0 ~ service { in_block=1; print; next }
    in_block && $0 ~ /^  [a-zA-Z0-9_-]+:/ { exit }
    in_block { print }
  ' "${COMPOSE_FILE}"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  grep -q "${needle}" <<<"${haystack}" || fail "missing '${needle}' in compose service block"
}

# Profile-level backend contract
assert_eq "COCKPIT_SECRETS_BACKEND" "postgres"
assert_eq "COCKPIT_OBJECT_STORAGE_BACKEND" "postgres"
assert_eq "RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND" "redis"
assert_eq "RUNTIME_SHARED_WORKER_STATE_BACKEND" "redis"

CONTROL_BLOCK="$(service_block "control-api")"
RUNTIME_BLOCK="$(service_block "runtime-engine")"

[[ -n "${CONTROL_BLOCK}" ]] || fail "control-api service block not found"
[[ -n "${RUNTIME_BLOCK}" ]] || fail "runtime-engine service block not found"

for key in AUTH_MODE COCKPIT_SECRETS_BACKEND COCKPIT_OBJECT_STORAGE_BACKEND RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND RUNTIME_SHARED_WORKER_STATE_BACKEND DATABASE_URL POSTGRES_URL REDIS_URL; do
  assert_contains "${CONTROL_BLOCK}" "${key}:"
  assert_contains "${RUNTIME_BLOCK}" "${key}:"
done

assert_contains "${CONTROL_BLOCK}" "DATABASE_URL: \${DATABASE_URL:-postgres://"
assert_contains "${CONTROL_BLOCK}" "POSTGRES_URL: \${POSTGRES_URL:-postgres://"
assert_contains "${CONTROL_BLOCK}" "REDIS_URL: \${REDIS_URL:-redis://"

assert_contains "${RUNTIME_BLOCK}" "DATABASE_URL: \${DATABASE_URL:-postgres://"
assert_contains "${RUNTIME_BLOCK}" "POSTGRES_URL: \${POSTGRES_URL:-postgres://"
assert_contains "${RUNTIME_BLOCK}" "REDIS_URL: \${REDIS_URL:-redis://"

echo "[contract-check] PASS: profile '${PROFILE}' satisfies control-api <-> runtime-engine contract."
