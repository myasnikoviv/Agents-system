#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[config-gate] validating config hardening"

# cockpit_config.json must not exist anywhere in the repo tree.
if find . -type f -name 'cockpit_config.json' -not -path './.git/*' | grep -q .; then
  echo "[config-gate] FAIL: legacy cockpit_config.json detected"
  find . -type f -name 'cockpit_config.json' -not -path './.git/*'
  exit 1
fi

# prevent accidental plaintext API keys inside tracked projects subtree.
if rg -n "sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}" projects scripts/scratch --hidden >/dev/null 2>&1; then
  echo "[config-gate] FAIL: possible plaintext API key detected in projects/scratch"
  rg -n "sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}" projects scripts/scratch --hidden || true
  exit 1
fi

echo "[config-gate] PASS"
