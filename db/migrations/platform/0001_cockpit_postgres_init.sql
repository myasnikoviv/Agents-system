-- 0001_cockpit_postgres_init.sql
-- Canonical initial schema for Cockpit Postgres backends.

CREATE TABLE IF NOT EXISTS cockpit_settings_pg (
  section TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cockpit_state_pg (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cockpit_policy_meta_pg (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT,
  event_kind TEXT NOT NULL,
  entity_id TEXT,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cockpit_audit_meta_pg (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  project_id TEXT,
  actor_id TEXT,
  reason TEXT,
  target_json JSONB,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cockpit_secrets_pg (
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  key TEXT NOT NULL,
  cipher_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  PRIMARY KEY (tenant_id, workspace_id, key)
);

CREATE INDEX IF NOT EXISTS idx_cockpit_secrets_pg_scope
  ON cockpit_secrets_pg(tenant_id, workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cockpit_object_storage_pg (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  project_id TEXT,
  thread_id TEXT,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  content_base64 TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_pg_bucket_key
  ON cockpit_object_storage_pg(bucket, key);

CREATE INDEX IF NOT EXISTS idx_cockpit_object_storage_pg_project_thread
  ON cockpit_object_storage_pg(project_id, thread_id, created_at DESC);
