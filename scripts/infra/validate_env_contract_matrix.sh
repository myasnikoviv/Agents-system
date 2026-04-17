#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-local-self-hosted}"
PROFILE_FILE="config/runtime-profiles/${PROFILE}.env"

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "[env-contract] profile not found: ${PROFILE_FILE}" >&2
  exit 1
fi

set -a
source "${PROFILE_FILE}"
set +a
export RUNTIME_PROFILE="${RUNTIME_PROFILE:-$PROFILE}"

fail() {
  echo "[env-contract] FAIL: $1" >&2
  exit 1
}

required_non_empty() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "${value}" ]]; then
    fail "${key} is required for profile '${PROFILE}'"
  fi
}

ensure_allowed() {
  local key="$1"
  local value="${!key:-}"
  shift
  local allowed=("$@")
  for candidate in "${allowed[@]}"; do
    if [[ "${value}" == "${candidate}" ]]; then
      return 0
    fi
  done
  fail "${key}='${value}' is not allowed for profile '${PROFILE}'. Allowed: ${allowed[*]}"
}

ensure_forbidden() {
  local key="$1"
  local forbidden="$2"
  local value="${!key:-}"
  if [[ "${value}" == "${forbidden}" ]]; then
    fail "${key}='${value}' is forbidden for profile '${PROFILE}'"
  fi
}

required_non_empty "RUNTIME_PROFILE"
required_non_empty "COCKPIT_SECRETS_BACKEND"
required_non_empty "COCKPIT_OBJECT_STORAGE_BACKEND"
required_non_empty "RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND"
required_non_empty "RUNTIME_SHARED_WORKER_STATE_BACKEND"
required_non_empty "AUTH_MODE"

ensure_forbidden "COCKPIT_SECRETS_BACKEND" "sqlite"
ensure_forbidden "COCKPIT_OBJECT_STORAGE_BACKEND" "sqlite"
ensure_forbidden "RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND" "sqlite"
ensure_forbidden "RUNTIME_SHARED_WORKER_STATE_BACKEND" "sqlite"

ensure_allowed "COCKPIT_SECRETS_BACKEND" "postgres" "redis" "memory"
ensure_allowed "COCKPIT_OBJECT_STORAGE_BACKEND" "postgres" "redis" "memory"
ensure_allowed "RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND" "redis" "postgres" "memory"
ensure_allowed "RUNTIME_SHARED_WORKER_STATE_BACKEND" "redis" "postgres" "memory"
ensure_allowed "AUTH_MODE" "required" "optional"

if [[ "${PROFILE}" == "cloud-ready" ]]; then
  if [[ "${AUTH_MODE}" != "required" ]]; then
    fail "AUTH_MODE must be 'required' for cloud-ready profile"
  fi
fi

echo "[env-contract] PASS: profile='${PROFILE}' runtime_profile='${RUNTIME_PROFILE}'"
echo "[env-contract] backends: secrets=${COCKPIT_SECRETS_BACKEND} object_storage=${COCKPIT_OBJECT_STORAGE_BACKEND} dispatch=${RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND} worker_state=${RUNTIME_SHARED_WORKER_STATE_BACKEND} auth=${AUTH_MODE}"
