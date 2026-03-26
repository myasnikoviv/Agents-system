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
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "OpenHands already running (pid $(cat "$PID_FILE"))."
      exit 0
    fi
    if [[ ! -x "$VENV_DIR/bin/python" ]]; then
      echo "OpenHands venv python not found: $VENV_DIR/bin/python"
      echo "Create env first (example): python3 -m venv .venv_openhands && .venv_openhands/bin/pip install fastapi uvicorn pydantic openai anthropic google-genai"
      exit 1
    fi
    echo "Starting OpenHands Agent Server on $HOST:$PORT..."
    "$VENV_DIR/bin/python" "$SCRIPT_DIR/agent_server.py" --port "$PORT" --host "$HOST" > "$ROOT_DIR/openhands_server.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    sleep 1
    if ! kill -0 "$PID" 2>/dev/null; then
      echo "OpenHands failed to stay alive. See $ROOT_DIR/openhands_server.log"
      exit 1
    fi
    code="$(curl -s -o /dev/null -w "%{http_code}" "http://$HOST:$PORT/health" || true)"
    echo "Agent server started (pid $PID). /health=$code"
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
