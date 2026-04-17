# AGSYS-3867 — Secrets Source of Truth and Rotation Policy

## Source of truth
- Primary source of truth for runtime/control secrets: Postgres secrets store (`cockpit_secrets_pg` + versions table).
- Redis may be used only as short-lived runtime access path/cache; it is not authoritative.
- Plain-text secrets in repo files are forbidden.

## Scope model
- Secret scope key: `tenant_id + workspace_id + user_scope + logical_key`.
- Resolution order:
  1. exact user scope
  2. workspace scope
  3. deny (no implicit global fallback)

## Rotation policy
- Standard rotation interval:
  - dev: every 30 days
  - stage/prod: every 14 days
- Immediate rotation triggers:
  - suspected exposure,
  - access role compromise,
  - provider key policy change.
- Every rotation must:
  1. archive previous version,
  2. write new version metadata (`rotated_at`, `rotated_by`),
  3. create audit event.

## Operational controls
- Profile preflight rejects sqlite secret backend in active profiles.
- Access to secret write/read APIs is role-gated and audited.
- Incident response must include secret revocation checklist when compromise is suspected.
