#!/usr/bin/env bash
set -euo pipefail

FILE="mcp.json"

if [[ ! -f "$FILE" ]]; then
  echo "[plane-mcp-check] FAIL: mcp.json not found"
  exit 1
fi

required=("PLANE_API_KEY" "PLANE_WORKSPACE_SLUG" "PLANE_API_HOST_URL")
missing=0

for key in "${required[@]}"; do
  if ! grep -q "\"$key\"" "$FILE"; then
    echo "[plane-mcp-check] FAIL: missing $key in plane env"
    missing=1
  fi
done

if [[ $missing -ne 0 ]]; then
  exit 2
fi

echo "[plane-mcp-check] PASS: plane MCP env keys are present"
