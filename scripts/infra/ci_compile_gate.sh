#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

echo "[compile-gate] install dependencies"
npm ci

echo "[compile-gate] cleanup tracked legacy artifacts from src"
bash scripts/infra/cleanup_legacy_artifacts.sh

echo "[compile-gate] verify no generated artifacts remain in src"
leftover_decls="$(git ls-files 'packages/*/src/**/*.d.ts' 'packages/*/src/**/*.d.ts.map' 'packages/*/src/**/*.js.map' 'apps/*/src/**/*.d.ts' 'apps/*/src/**/*.d.ts.map' 'apps/*/src/**/*.js.map' | grep -v '^apps/client-app/src/types/dagre.d.ts$' || true)"
if [[ -n "${leftover_decls}" ]]; then
  echo "[compile-gate] FAIL: tracked declaration/map artifacts in src:" >&2
  echo "${leftover_decls}" >&2
  exit 1
fi

leftover_js_with_ts="$(
  while IFS= read -r file; do
    [[ -z "${file}" ]] && continue
    ts_file="${file%.js}.ts"
    if [[ -f "${ts_file}" ]]; then
      echo "${file}"
    fi
  done < <(git ls-files 'packages/*/src/**/*.js' 'apps/*/src/**/*.js')
)"
if [[ -n "${leftover_js_with_ts}" ]]; then
  echo "[compile-gate] FAIL: tracked js artifacts in src that have ts twins:" >&2
  echo "${leftover_js_with_ts}" >&2
  exit 1
fi

echo "[compile-gate] strict project-references build"
# Force rebuild to avoid stale tsbuildinfo/dist coupling in CI cache scenarios.
npx tsc -b --force tsconfig.build.json

echo "[compile-gate] PASS"
