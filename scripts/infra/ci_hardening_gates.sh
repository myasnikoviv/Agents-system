#!/usr/bin/env bash
set -euo pipefail

echo "[hardening-gates] install dependencies"
npm ci

echo "[hardening-gates] config hardening gate"
npm run infra:ci:config-gate
npm run infra:ci:frontend-split-gate

echo "[hardening-gates] control/runtime contract guardrail"
npm run infra:validate:control-runtime-contract -- local-self-hosted
npm run infra:validate:control-runtime-contract -- cloud-ready

echo "[hardening-gates] distributed profile guardrail"
npm run infra:validate:distributed-profile -- local-self-hosted
npm run infra:validate:distributed-profile -- cloud-ready

echo "[hardening-gates] env contract matrix validation"
bash scripts/infra/validate_env_contract_matrix.sh local-self-hosted
bash scripts/infra/validate_env_contract_matrix.sh cloud-ready

echo "[hardening-gates] PASS"
