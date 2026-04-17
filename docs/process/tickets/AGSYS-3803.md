# Ticket: AGSYS-3803
## Extract auth/session boundary module

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Зібрати auth/session helpers у єдиний boundary module з явним public API та мінімальним coupling до index.ts.

### Acceptance Criteria
- [x] auth/session helpers не розкидані по index.ts
- [x] explicit module interface for auth/session operations
- [x] auth flow smoke checks pass

### Evidence Required
- auth smoke command results
- references to extracted module and used interface

### Evidence
- Extracted boundary module:
  - `apps/control-api/src/auth/AuthSessionBoundary.ts`
- Integration reference:
  - `apps/control-api/src/index.ts` imports `createAuthSessionBoundary` and consumes injected API (`hashPassword`, `createAuthSession`, `getAuthContextPg`, token/hash helpers).
- Build check:
  - `npm run build -w apps/control-api` PASS
- Auth smoke:
  - `GET /api/health` PASS
  - `POST /api/auth/login` PASS (token issued)
