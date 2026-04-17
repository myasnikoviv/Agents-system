#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-local-self-hosted}"
PROFILE_FILE="${ROOT_DIR}/config/runtime-profiles/${PROFILE}.env"

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "[distributed-guardrail] FAIL: profile not found: ${PROFILE_FILE}" >&2
  exit 1
fi

set -a
source "${PROFILE_FILE}"
set +a

fail() {
  echo "[distributed-guardrail] FAIL: $1" >&2
  exit 1
}

assert_not_sqlite() {
  local key="$1"
  local actual="${!key:-}"
  if [[ -z "${actual}" ]]; then
    fail "${key} is empty in profile '${PROFILE}'. Set it explicitly to a distributed backend."
  fi
  if [[ "${actual}" == "sqlite" ]]; then
    fail "${key}=sqlite is forbidden for distributed profile '${PROFILE}'. Use postgres/redis backend."
  fi
}

# Distributed guardrail baseline for sprint hardening.
assert_not_sqlite "COCKPIT_SECRETS_BACKEND"
assert_not_sqlite "COCKPIT_OBJECT_STORAGE_BACKEND"
assert_not_sqlite "RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND"
assert_not_sqlite "RUNTIME_SHARED_WORKER_STATE_BACKEND"

echo "[distributed-guardrail] PASS: profile '${PROFILE}' has no sqlite shared backends."
echo "[distributed-guardrail] backends: secrets=${COCKPIT_SECRETS_BACKEND} object_storage=${COCKPIT_OBJECT_STORAGE_BACKEND} dispatch=${RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND} worker_state=${RUNTIME_SHARED_WORKER_STATE_BACKEND}"
