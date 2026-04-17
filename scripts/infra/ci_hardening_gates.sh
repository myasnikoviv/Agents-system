#!/usr/bin/env bash
set -euo pipefail

echo "[hardening-gates] install dependencies"
npm ci

echo "[hardening-gates] workspace build (backend scope)"
BACKEND_WORKSPACES=(
  "packages/shared"
  "packages/events"
  "packages/governance"
  "packages/memory"
  "packages/runtime"
  "packages/billing"
  "apps/control-api"
  "apps/runtime-engine"
)
for workspace in "${BACKEND_WORKSPACES[@]}"; do
  echo "[hardening-gates] build workspace=${workspace}"
  npm run build -w "${workspace}"
done

echo "[hardening-gates] control-api build"
npm run build -w apps/control-api

echo "[hardening-gates] runtime-engine build"
npm run build -w apps/runtime-engine

echo "[hardening-gates] distributed profile guardrail"
npm run infra:validate:distributed-profile -- local-self-hosted
npm run infra:validate:distributed-profile -- cloud-ready

echo "[hardening-gates] env contract matrix validation"
bash scripts/infra/validate_env_contract_matrix.sh local-self-hosted
bash scripts/infra/validate_env_contract_matrix.sh cloud-ready

echo "[hardening-gates] PASS"
