#!/usr/bin/env bash
set -euo pipefail
PROFILE="${1:-local-self-hosted}"
PROFILE_FILE="config/runtime-profiles/${PROFILE}.env"
if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Profile not found: $PROFILE_FILE" >&2
  exit 1
fi
set -a
source "$PROFILE_FILE"
set +a
exec docker compose -f docker-compose.runtime.yml up -d --build
