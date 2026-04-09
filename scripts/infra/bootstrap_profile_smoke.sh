#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:-local-self-hosted}"
PORT="${2:-3321}"
HOST="127.0.0.1"
PROFILE_FILE="config/runtime-profiles/${PROFILE}.env"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Profile not found: $PROFILE_FILE" >&2
  exit 1
fi

set -a
source "$PROFILE_FILE"
set +a

TMP_LOG="/tmp/agsys_bootstrap_${PROFILE}_${PORT}.log"
AGENT_SYSTEM_BACKEND_PORT="$PORT" HOST="$HOST" AUTH_MODE="${AUTH_MODE:-required}" npx tsx src/server/agentSystemBackend.ts >"$TMP_LOG" 2>&1 &
PID=$!

cleanup() {
  if ps -p "$PID" >/dev/null 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
    sleep 0.4
    kill -9 "$PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

DEADLINE=$((SECONDS + 35))
until curl -s "http://${HOST}:${PORT}/api/health" >/dev/null 2>&1; do
  if (( SECONDS >= DEADLINE )); then
    echo "backend_start_timeout profile=$PROFILE port=$PORT" >&2
    tail -n 120 "$TMP_LOG" >&2 || true
    exit 1
  fi
  sleep 0.25
done

PROFILE_JSON="$(curl -s "http://${HOST}:${PORT}/api/cockpit/runtime/infrastructure-profile")"
if [[ -z "$PROFILE_JSON" ]]; then
  echo "failed_to_read_runtime_profile profile=$PROFILE" >&2
  exit 1
fi

echo "profile=$PROFILE port=$PORT"
echo "$PROFILE_JSON"
