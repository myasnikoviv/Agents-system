# Ticket: AGSYS-3811
## Add fail-fast startup checks for cloud-ready dependencies

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати startup guard: у cloud-ready mode сервіс не стартує без доступних Redis/Postgres.

### Acceptance Criteria
- [x] clear actionable error on missing distributed dependencies
- [x] local-self-hosted profile remains unaffected
- [x] startup checks documented

### Evidence Required
- negative/positive startup check logs
- docs update with expected errors

### Evidence
- Startup guard implementation:
  - `apps/control-api/src/index.ts` (`validateStartupDependencies`, cloud-ready checks)
  - `apps/control-api/src/bootstrap/serverStartup.ts` (`validateStartupDependencies` hook before listen)
- Profile propagation:
  - `config/runtime-profiles/cloud-ready.env` (`RUNTIME_PROFILE=cloud-ready`)
  - `config/runtime-profiles/local-self-hosted.env` (`RUNTIME_PROFILE=local-self-hosted`)
  - `scripts/infra/start_with_profile.sh` and `scripts/infra/container_compose_up.sh` export `RUNTIME_PROFILE`
  - `infra/compose/runtime.yml` forwards `RUNTIME_PROFILE` into service env
- Negative startup check (cloud-ready, invalid Postgres):
  - health endpoint unreachable
  - log contains actionable error:
    - `cloud_ready_dependency_check_failed: postgres_unavailable (connect ECONNREFUSED 127.0.0.1:6543)...`
- Positive startup check (local-self-hosted, valid dependencies):
  - `GET /api/health` reachable and returns `success=true`
- Startup checks documentation:
  - `docs/process/designs/AGSYS-3811-cloud-ready-startup-guard.md`
