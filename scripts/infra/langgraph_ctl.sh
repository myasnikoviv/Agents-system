#!/bin/bash

set -euo pipefail

LABEL="com.agent-system.langgraph2024"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="/Users/myasnikoviv/development/agent-system"
BIN_PATH="${PROJECT_DIR}/node_modules/.bin/langgraphjs"
OUT_LOG="/tmp/langgraph-launchd.out.log"
ERR_LOG="/tmp/langgraph-launchd.err.log"

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
    <string>${BIN_PATH}</string>
    <string>dev</string>
    <string>--host</string>
    <string>127.0.0.1</string>
    <string>--port</string>
    <string>2024</string>
    <string>-n</string>
    <string>1</string>
    <string>--no-browser</string>
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

start_service() {
  if [[ ! -x "$BIN_PATH" ]]; then
    echo "Missing ${BIN_PATH}. Run: npm install"
    exit 1
  fi

  write_plist
  launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  launchctl kickstart -k "gui/$(id -u)/${LABEL}"
  sleep 2
  code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:2024/info || true)"
  echo "LangGraph ${LABEL} started. /info=${code}"
}

stop_service() {
  launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
  echo "LangGraph ${LABEL} stopped."
}

status_service() {
  if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
    launchctl print "gui/$(id -u)/${LABEL}" | rg "state =|pid =|runs =|last exit code" || true
    code="$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:2024/info || true)"
    echo "/info=${code}"
  else
    echo "LangGraph ${LABEL} is not loaded."
  fi
}

case "${1:-}" in
  start) start_service ;;
  stop) stop_service ;;
  restart) stop_service; start_service ;;
  status) status_service ;;
  *) usage; exit 1 ;;
esac
