#!/usr/bin/env bash
set -euo pipefail

CLIENT_APP_BASE_URL="${CLIENT_APP_BASE_URL:-http://127.0.0.1:4173}"

echo "[smoke:client] base=${CLIENT_APP_BASE_URL}"
curl -fsS "${CLIENT_APP_BASE_URL}/" | tee /tmp/agsys_smoke_client_root.out >/dev/null

if [[ ! -s /tmp/agsys_smoke_client_root.out ]]; then
  echo "[smoke:client] FAIL: empty response body from ${CLIENT_APP_BASE_URL}/" >&2
  exit 1
fi

echo "[smoke:client] PASS"
echo "[smoke:client] / => $(head -c 200 /tmp/agsys_smoke_client_root.out)"
