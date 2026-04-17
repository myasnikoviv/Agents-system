# Ticket: AGSYS-3821
## Add reference reverse-proxy configuration

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати референсний Nginx proxy config в `infra/proxy/` для prod-like simulation.

### Acceptance Criteria
- [x] proxy config committed under `infra/proxy/`
- [x] proxy routes client/api/runtime as designed
- [x] smoke script validates proxied paths

### Evidence Required
- proxy config file path
- smoke outputs for proxied endpoints

### Implementation Notes
- Added reference Nginx config:
  - `infra/proxy/nginx.reference.conf`
- Routing model:
  - `/` -> client-app upstream (`host.docker.internal:4173`)
  - `/api/*` -> control-api upstream (`host.docker.internal:3001`)
  - `/runtime/*` -> runtime-engine upstream (`host.docker.internal:3002`) with prefix strip
- Added proxy smoke script:
  - `scripts/infra/smoke_proxy_paths.sh`
- Added npm command:
  - `infra:smoke:proxy`

### Verification Evidence (2026-04-17)
- Command:
  - `npm run infra:smoke:proxy`
- Result:
  - `[proxy-smoke] PASS`
  - `/ => {"service":"client-app","ok":true}`
  - `/api/health => {"service":"control-api","ok":true}`
  - `/runtime/health => {"service":"runtime-engine","ok":true}`
