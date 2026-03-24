#!/usr/bin/env bash
# scripts/openhands/server_ctl.sh - OpenHands Agent Server Control
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv_openhands"
PID_FILE="$ROOT_DIR/.openhands_server.pid"
PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"

case "${1:-status}" in
  start)
    echo "Starting OpenHands Agent Server on $HOST:$PORT..."
    "$VENV_DIR/bin/python" "$SCRIPT_DIR/agent_server.py" --port "$PORT" --host "$HOST" > "$ROOT_DIR/openhands_server.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    echo "Agent server started (pid $PID)."
    ;;
  stop)
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        echo "Stopping server (pid $PID)..."
        kill "$PID" || true
        rm "$PID_FILE"
        echo "Stopped."
    else
        echo "Server is not running (no PID file)."
    fi
    ;;
  status)
    if [[ -f "$PID_FILE" ]] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo "Running (pid $(cat "$PID_FILE"))."
    else
        echo "Stopped."
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
