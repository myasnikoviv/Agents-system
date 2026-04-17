#!/usr/bin/env bash
set -euo pipefail

CONTROL_API_BASE_URL="${CONTROL_API_BASE_URL:-http://127.0.0.1:3001}"
EMAIL="agsys3861_$(date +%s)@example.com"
PASSWORD='Passw0rd!'
TENANT='tenant-3861'
WORKSPACE='workspace-3861'

echo "[topology-smoke] base=${CONTROL_API_BASE_URL}"

curl -fsS -X POST "${CONTROL_API_BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"tenantId\":\"${TENANT}\",\"workspaceId\":\"${WORKSPACE}\"}" \
  >/tmp/agsys_3861_register.json

curl -fsS -X POST "${CONTROL_API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  >/tmp/agsys_3861_login.json

TOKEN="$(jq -r '.token' /tmp/agsys_3861_login.json)"
if [[ -z "${TOKEN}" || "${TOKEN}" == "null" ]]; then
  echo "[topology-smoke] FAIL: token missing" >&2
  exit 1
fi

curl -fsS "${CONTROL_API_BASE_URL}/api/system/topology/services" \
  -H "Authorization: Bearer ${TOKEN}" \
  >/tmp/agsys_3861_services.json

curl -fsS "${CONTROL_API_BASE_URL}/api/system/topology/snapshot" \
  -H "Authorization: Bearer ${TOKEN}" \
  >/tmp/agsys_3861_snapshot.json

jq -e '.success == true and .schema == "agsys.service-topology.v1" and (.services | length) >= 3' /tmp/agsys_3861_services.json >/dev/null
jq -e '.success == true and .schema == "agsys.service-topology.v1" and (.dependencies | length) >= 3 and (.errorSurface | type) == "array"' /tmp/agsys_3861_snapshot.json >/dev/null
jq -e '.services[] | select(.id=="control-api") | .state' /tmp/agsys_3861_snapshot.json >/dev/null

echo "[topology-smoke] PASS"
echo "[topology-smoke] services summary: $(jq -c '{summary, count: (.services|length)}' /tmp/agsys_3861_services.json)"
echo "[topology-smoke] snapshot summary: $(jq -c '{summary, dependencies: (.dependencies|length), errorSurface: (.errorSurface|length)}' /tmp/agsys_3861_snapshot.json)"
