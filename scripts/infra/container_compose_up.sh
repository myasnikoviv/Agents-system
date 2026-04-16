#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${1:-local-self-hosted}"
DRY_RUN="${2:-}"
PROFILE_FILE="${ROOT_DIR}/config/runtime-profiles/${PROFILE}.env"
COMPOSE_FILE="${ROOT_DIR}/infra/compose/runtime.yml"

if [[ ! -f "${PROFILE_FILE}" ]]; then
  echo "Profile not found: ${PROFILE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

CONTRACT_CHECK_SCRIPT="${ROOT_DIR}/scripts/infra/validate_control_runtime_contract.sh"
if [[ ! -x "${CONTRACT_CHECK_SCRIPT}" ]]; then
  echo "Contract validation script not executable: ${CONTRACT_CHECK_SCRIPT}" >&2
  exit 1
fi

set -a
source "${PROFILE_FILE}"
set +a

${CONTRACT_CHECK_SCRIPT} "${PROFILE}"

if [[ "${COCKPIT_SECRETS_BACKEND:-}" == "sqlite" || "${COCKPIT_OBJECT_STORAGE_BACKEND:-}" == "sqlite" || "${RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND:-}" == "sqlite" || "${RUNTIME_SHARED_WORKER_STATE_BACKEND:-}" == "sqlite" ]]; then
  echo "Invalid profile '${PROFILE}': sqlite backends are not allowed." >&2
  exit 1
fi

CMD=(docker compose -f "${COMPOSE_FILE}" up -d --build)
if [[ "${DRY_RUN}" == "--dry-run" ]]; then
  printf '[dry-run] %q ' "${CMD[@]}"
  printf '\n'
  exit 0
fi

exec "${CMD[@]}"
