#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="local-self-hosted"
RESTART_MODE="false"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="${2:-}"
      shift
      ;;
    --restart|--force-restart)
      RESTART_MODE="true"
      ;;
    --standalone)
      # Legacy flag kept for backward compatibility. Compose is now the default path.
      ;;
    *)
      echo "Unknown parameter passed: $1" >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "${RESTART_MODE}" == "true" ]]; then
  echo "[infra:start] restart requested, recreating compose stack"
  docker compose -f "${ROOT_DIR}/infra/compose/runtime.yml" down --remove-orphans || true
fi

echo "[infra:start] starting compose stack with profile=${PROFILE}"
bash "${ROOT_DIR}/scripts/infra/container_compose_up.sh" "${PROFILE}"

echo "[infra:start] running startup checks"
bash "${ROOT_DIR}/scripts/infra/startup_check.sh" --compose

echo "[infra:start] Agent System is ready"
echo "[infra:start] control-api: http://127.0.0.1:3001/api/health"
echo "[infra:start] runtime-engine: http://127.0.0.1:3002/health"
