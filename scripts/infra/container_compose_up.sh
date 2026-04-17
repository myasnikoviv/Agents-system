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

DISTRIBUTED_GUARDRAIL_SCRIPT="${ROOT_DIR}/scripts/infra/validate_distributed_profile_guardrail.sh"
if [[ ! -x "${DISTRIBUTED_GUARDRAIL_SCRIPT}" ]]; then
  echo "Distributed profile guardrail script not executable: ${DISTRIBUTED_GUARDRAIL_SCRIPT}" >&2
  exit 1
fi
ENV_CONTRACT_SCRIPT="${ROOT_DIR}/scripts/infra/validate_env_contract_matrix.sh"
if [[ ! -x "${ENV_CONTRACT_SCRIPT}" ]]; then
  echo "Env contract validation script not executable: ${ENV_CONTRACT_SCRIPT}" >&2
  exit 1
fi

set -a
source "${PROFILE_FILE}"
set +a
export RUNTIME_PROFILE="${RUNTIME_PROFILE:-$PROFILE}"

${ENV_CONTRACT_SCRIPT} "${PROFILE}"
${CONTRACT_CHECK_SCRIPT} "${PROFILE}"
${DISTRIBUTED_GUARDRAIL_SCRIPT} "${PROFILE}"

CMD=(docker compose -f "${COMPOSE_FILE}" up -d --build)
if [[ "${DRY_RUN}" == "--dry-run" ]]; then
  printf '[dry-run] %q ' "${CMD[@]}"
  printf '\n'
  exit 0
fi

exec "${CMD[@]}"
