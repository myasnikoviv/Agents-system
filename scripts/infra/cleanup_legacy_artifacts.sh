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
done < <(git ls-files ':(glob)packages/*/src/**/*.d.ts' ':(glob)packages/*/src/**/*.d.ts.map' ':(glob)packages/*/src/**/*.js.map' ':(glob)apps/*/src/**/*.d.ts' ':(glob)apps/*/src/**/*.d.ts.map' ':(glob)apps/*/src/**/*.js.map')

# Remove tracked js files only when a twin ts file exists (generated js in src).
while IFS= read -r file; do
  [[ -z "${file}" ]] && continue
  ts_file="${file%.js}.ts"
  if [[ -f "${ts_file}" ]]; then
    git rm -f --quiet -- "${file}" || true
    removed=$((removed + 1))
  fi
done < <(git ls-files ':(glob)packages/*/src/**/*.js' ':(glob)apps/*/src/**/*.js' ':(glob)scripts/**/*.js')

echo "[cleanup-legacy] removed tracked legacy artifacts: ${removed}"
