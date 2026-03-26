#!/bin/bash

set -euo pipefail

LABEL="com.agent-system.backend3001"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="/Users/myasnikoviv/development/agent-system"
OUT_LOG="/tmp/agent-system-backend.out.log"
ERR_LOG="/tmp/agent-system-backend.err.log"
PIDFILE="/tmp/agent-system-backend.pid"
RUNNER_SCRIPT="/tmp/agent-system-backend-runner.sh"
RUNNER="${AGSYS_BACKEND_RUNNER:-fallback}" # fallback|launchd

usage() {
  echo "Usage: $0 {start|stop|restart|status}"
}

write_plist() {
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/npm</string>
    <string>run</string>
    <string>backend:start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${PROJECT_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${OUT_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${ERR_LOG}</string>
</dict>
</plist>
EOF
}

launchd_context_available() {
  launchctl print "gui/$(id -u)" >/dev/null 2>&1
}

wait_health() {
  local retries=15
  local code="000"
  while [[ $retries -gt 0 ]]; do
    code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || true)"
    if [[ "$code" == "200" ]]; then
      echo "Backend started. /api/health=${code}"
      return 0
    fi
    retries=$((retries - 1))
    sleep 1
  done
  echo "Backend failed health-check. /api/health=${code}"
  echo "See logs: ${OUT_LOG} ${ERR_LOG}"
  return 1
}

start_fallback() {
  if [[ -f "$PIDFILE" ]]; then
    local existing_pid
    existing_pid="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [[ -n "${existing_pid}" ]] && ps -p "${existing_pid}" >/dev/null 2>&1; then
      echo "Backend fallback process already running (pid=${existing_pid})."
      wait_health
      return 0
    fi
    rm -f "$PIDFILE"
  fi

  cd "$PROJECT_DIR"
  cat > "$RUNNER_SCRIPT" <<EOF
#!/bin/bash
cd "$PROJECT_DIR" || exit 1
while true; do
  npm run -s backend:start >>"$OUT_LOG" 2>>"$ERR_LOG"
  echo "[backend_ctl] backend exited with code \$? at \$(date)" >>"$ERR_LOG"
  sleep 1
done
EOF
  chmod +x "$RUNNER_SCRIPT"
  nohup /bin/bash "$RUNNER_SCRIPT" >/dev/null 2>&1 &
  echo $! > "$PIDFILE"
  wait_health
}

stop_fallback() {
  if [[ ! -f "$PIDFILE" ]]; then
    return 0
  fi
  local pid
  pid="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [[ -n "${pid}" ]] && ps -p "${pid}" >/dev/null 2>&1; then
    pkill -P "${pid}" >/dev/null 2>&1 || true
    kill "${pid}" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "$PIDFILE"
  rm -f "$RUNNER_SCRIPT"
}

start_service() {
  if [[ "$RUNNER" == "launchd" ]] && launchd_context_available; then
    write_plist
    launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
    if launchctl bootstrap "gui/$(id -u)" "$PLIST" >/dev/null 2>&1; then
      launchctl kickstart -k "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
      wait_health && return 0
      echo "Launchd service is loaded but health-check failed, switching to fallback runner..."
      launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
    else
      echo "Launchd bootstrap failed; using fallback runner."
    fi
  elif [[ "$RUNNER" == "launchd" ]]; then
    echo "No launchd GUI context; using fallback runner."
  else
    echo "Using fallback runner by configuration (AGSYS_BACKEND_RUNNER=${RUNNER})."
  fi

  start_fallback
}

stop_service() {
  launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
  stop_fallback
  echo "Backend ${LABEL} stopped."
}

status_service() {
  if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
    launchctl print "gui/$(id -u)/${LABEL}" | rg "state =|pid =|runs =|last exit code" || true
    echo "runner=launchd"
  elif [[ -f "$PIDFILE" ]]; then
    pid="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && ps -p "${pid}" >/dev/null 2>&1; then
      echo "runner=fallback pid=${pid}"
    else
      echo "runner=fallback pidfile-stale"
      rm -f "$PIDFILE"
    fi
  else
    echo "Backend ${LABEL} is not loaded."
  fi
  code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || true)"
  echo "/api/health=${code}"
}

case "${1:-}" in
  start) start_service ;;
  stop) stop_service ;;
  restart) stop_service; start_service ;;
  status) status_service ;;
  *) usage; exit 1 ;;
esac
