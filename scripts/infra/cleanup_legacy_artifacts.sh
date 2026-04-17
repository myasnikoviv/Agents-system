#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

removed=0

# Remove tracked generated declaration/maps from source trees.
while IFS= read -r file; do
  [[ -z "${file}" ]] && continue
  if [[ "${file}" == "apps/client-app/src/types/dagre.d.ts" ]]; then
    continue
  fi
  git rm -f --quiet -- "${file}" || true
  removed=$((removed + 1))
done < <(git ls-files 'packages/*/src/**/*.d.ts' 'packages/*/src/**/*.d.ts.map' 'packages/*/src/**/*.js.map' 'apps/*/src/**/*.d.ts' 'apps/*/src/**/*.d.ts.map' 'apps/*/src/**/*.js.map')

# Remove tracked js files only when a twin ts file exists (generated js in src).
while IFS= read -r file; do
  [[ -z "${file}" ]] && continue
  ts_file="${file%.js}.ts"
  if [[ -f "${ts_file}" ]]; then
    git rm -f --quiet -- "${file}" || true
    removed=$((removed + 1))
  fi
done < <(git ls-files 'packages/*/src/**/*.js' 'apps/*/src/**/*.js')

echo "[cleanup-legacy] removed tracked legacy artifacts: ${removed}"
