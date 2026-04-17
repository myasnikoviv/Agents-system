#!/usr/bin/env bash
set -euo pipefail

echo "[smoke:suite] start"
bash scripts/infra/smoke/control_api_health.sh
bash scripts/infra/smoke/runtime_dispatch.sh
bash scripts/infra/smoke/client_availability.sh
bash scripts/infra/smoke/proxy_path.sh
echo "[smoke:suite] PASS"
