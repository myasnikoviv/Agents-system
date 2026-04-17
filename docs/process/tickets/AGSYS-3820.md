# Ticket: AGSYS-3820
## Create LB-ready endpoint and port mapping

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Зафіксувати routing map для Nginx/ALB: client, control-api, runtime-engine.

### Acceptance Criteria
- [x] documented routing map with ports and paths
- [x] internal-only/runtime exposure policy stated
- [x] reference deploy topology diagram included

### Evidence Required
- design doc link
- reviewed route map with examples

### Implementation Notes
- Added routing/design artifact:
  - `docs/process/designs/AGSYS-3820-lb-routing-map.md`
- The document includes:
  - LB/proxy port mapping
  - path-to-upstream routing map (`/`, `/api/*`, `/runtime/*`)
  - internal-only exposure policy for runtime/data services
  - reference deploy topology diagram (Mermaid)

### Verification Evidence (2026-04-17)
- Design artifact completed and aligned with:
  - `infra/compose/runtime.yml`
  - `infra/proxy/nginx.reference.conf`
- Route behavior examples covered:
  - `/api/health` -> control-api
  - `/runtime/health` -> runtime-engine `/health`
  - `/runtime/ready` -> runtime-engine `/ready`
- Proxy smoke reference:
  - `npm run infra:smoke:proxy` (PASS; see AGSYS-3821 evidence)
