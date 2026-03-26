#!/bin/bash

set -euo pipefail

LABEL="com.agent-system.backend3001"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
PROJECT_DIR="/Users/myasnikoviv/development/agent-system"
OUT_LOG="/tmp/agent-system-backend.out.log"
ERR_LOG="/tmp/agent-system-backend.err.log"

usage() {
  echo "Usage: $0 {start|stop|restart|status}"
}

write_plist() {
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<PLIST
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
PLIST
}

launchctl_domains() {
  echo "user/$(id -u)"
  echo "gui/$(id -u)"
}

try_bootout_all() {
  while read -r domain; do
    launchctl bootout "${domain}/${LABEL}" >/dev/null 2>&1 || true
  done < <(launchctl_domains)
}

bootstrap_in_available_domain() {
  local domain
  while read -r domain; do
    if launchctl bootstrap "$domain" "$PLIST" >/dev/null 2>&1; then
      echo "$domain"
      return 0
    fi
  done < <(launchctl_domains)
  return 1
}

wait_health() {
  local retries=20
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

start_service() {
  write_plist
  try_bootout_all
  local domain
  domain="$(bootstrap_in_available_domain || true)"
  if [[ -z "$domain" ]]; then
    echo "Failed to bootstrap ${LABEL} in both user and gui domains."
    return 1
  fi
  launchctl kickstart -k "${domain}/${LABEL}" >/dev/null 2>&1 || true
  wait_health
}

stop_service() {
  try_bootout_all
  echo "Backend ${LABEL} stopped."
}

status_service() {
  local found=0
  local domain
  while read -r domain; do
    if launchctl print "${domain}/${LABEL}" >/dev/null 2>&1; then
      echo "domain=${domain}"
      launchctl print "${domain}/${LABEL}" | rg "state =|pid =|runs =|last exit code" || true
      found=1
    fi
  done < <(launchctl_domains)

  if [[ "$found" -eq 0 ]]; then
    echo "Backend ${LABEL} is not loaded."
  fi

  local code
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
