#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/db/migrations"

DB_URL="${POSTGRES_URL:-${DATABASE_URL:-}}"
if [[ -z "${DB_URL}" ]]; then
  echo "[migrate] ERROR: POSTGRES_URL or DATABASE_URL is required." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[migrate] ERROR: psql is not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
  echo "[migrate] ERROR: migrations directory not found: ${MIGRATIONS_DIR}" >&2
  exit 1
fi

echo "[migrate] DB: ${DB_URL%%\?*}"
echo "[migrate] Migrations dir: ${MIGRATIONS_DIR}"

psql "${DB_URL}" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS cockpit_schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

shopt -s nullglob
migration_files=("${MIGRATIONS_DIR}"/*.sql)
if [[ ${#migration_files[@]} -eq 0 ]]; then
  echo "[migrate] No migrations found."
  exit 0
fi

for migration_file in "${migration_files[@]}"; do
  version="$(basename "${migration_file}" .sql)"
  checksum="$(shasum -a 256 "${migration_file}" | awk '{print $1}')"

  existing_checksum="$({
    psql "${DB_URL}" -At -v ON_ERROR_STOP=1 \
      -c "SELECT checksum FROM cockpit_schema_migrations WHERE version = '${version}' LIMIT 1;"
  } || true)"

  if [[ -n "${existing_checksum}" ]]; then
    if [[ "${existing_checksum}" != "${checksum}" ]]; then
      echo "[migrate] ERROR: checksum mismatch for ${version}" >&2
      echo "[migrate] Existing: ${existing_checksum}" >&2
      echo "[migrate] Current : ${checksum}" >&2
      exit 1
    fi
    echo "[migrate] skip ${version} (already applied)"
    continue
  fi

  echo "[migrate] apply ${version}"
  {
    echo "BEGIN;"
    cat "${migration_file}"
    echo "INSERT INTO cockpit_schema_migrations(version, checksum, applied_at) VALUES ('${version}', '${checksum}', NOW());"
    echo "COMMIT;"
  } | psql "${DB_URL}" -v ON_ERROR_STOP=1

  echo "[migrate] applied ${version}"
done

echo "[migrate] done"
