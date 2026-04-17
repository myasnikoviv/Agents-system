#!/usr/bin/env bash
set -euo pipefail
PROFILE="${1:-local-self-hosted}"
PROFILE_FILE="config/runtime-profiles/${PROFILE}.env"
GUARDRAIL_SCRIPT="scripts/infra/validate_distributed_profile_guardrail.sh"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Profile not found: $PROFILE_FILE" >&2
  exit 1
fi

if [[ ! -x "$GUARDRAIL_SCRIPT" ]]; then
  echo "Distributed profile guardrail script not executable: $GUARDRAIL_SCRIPT" >&2
  exit 1
fi

set -a
source "$PROFILE_FILE"
set +a
export RUNTIME_PROFILE="${RUNTIME_PROFILE:-$PROFILE}"

bash "$GUARDRAIL_SCRIPT" "$PROFILE"

exec bash scripts/infra/start_all.sh --standalone
