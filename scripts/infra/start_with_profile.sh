#!/usr/bin/env bash
set -euo pipefail
PROFILE="${1:-local-self-hosted}"
PROFILE_FILE="config/runtime-profiles/${PROFILE}.env"
GUARDRAIL_SCRIPT="scripts/infra/validate_distributed_profile_guardrail.sh"
ENV_CONTRACT_SCRIPT="scripts/infra/validate_env_contract_matrix.sh"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Profile not found: $PROFILE_FILE" >&2
  exit 1
fi

if [[ ! -x "$GUARDRAIL_SCRIPT" ]]; then
  echo "Distributed profile guardrail script not executable: $GUARDRAIL_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$ENV_CONTRACT_SCRIPT" ]]; then
  echo "Env contract validation script not executable: $ENV_CONTRACT_SCRIPT" >&2
  exit 1
fi

set -a
source "$PROFILE_FILE"
set +a
export RUNTIME_PROFILE="${RUNTIME_PROFILE:-$PROFILE}"

bash "$ENV_CONTRACT_SCRIPT" "$PROFILE"
bash "$GUARDRAIL_SCRIPT" "$PROFILE"

bash scripts/infra/container_compose_up.sh "$PROFILE"
exec bash scripts/infra/startup_check.sh --compose
