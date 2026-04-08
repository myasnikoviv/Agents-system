# AGSYS-2502 Backend Refactor Plan

## Scope
Decompose `src/server/agentSystemBackend.ts` into domain route modules and service adapters without breaking existing API contracts.

## Baseline
- Current backend file combines:
  - health/contracts
  - swarm worker control
  - governance APIs
  - provider/CLI checks
  - cockpit settings
  - chat + streaming events
  - plane sync

## Refactor Strategy

### Phase 1: Route Extraction (no behavioral change)
- Introduce route registration modules:
  - `src/server/routes/healthRoutes.ts`
  - `src/server/routes/governanceRoutes.ts`
  - `src/server/routes/swarmRoutes.ts`
  - `src/server/routes/cockpitSettingsRoutes.ts`
  - `src/server/routes/providerRoutes.ts`
  - `src/server/routes/chatRoutes.ts`
  - `src/server/routes/planeRoutes.ts`
- Keep response schema compatible.

### Phase 2: Service Facades
- Introduce service layer adapters:
  - `src/runtime/services/governanceService.ts`
  - `src/runtime/services/dispatchService.ts`
  - `src/runtime/services/workerService.ts`
  - `src/runtime/services/telemetryService.ts`
  - `src/runtime/services/projectService.ts`
- Route handlers call only service layer.

### Phase 3: Composition Root
- Keep single app bootstrap:
  - `src/server/bootstrap/createApp.ts`
  - `src/server/bootstrap/registerRoutes.ts`
- Backend entrypoint only initializes runtime deps and starts server.

### Phase 4: Hardening
- Add route-level auth context hook placeholders for Sprint 25 auth/rbac tasks.
- Add centralized error mapping middleware.
- Add request id correlation in logs.

## Endpoint Ownership Map (v1)

1. Governance endpoints -> governanceRoutes + governanceService
- `/api/governance/*`
- `/api/cockpit/governance/*`

2. Swarm/queue/worker endpoints -> swarmRoutes + dispatch/worker services
- `/api/cockpit/swarm/*`

3. Chat runtime endpoints -> chatRoutes + runtime executor service
- `/api/chat*`
- `/api/events/stream`

4. Provider checks/config -> providerRoutes
- `/api/cockpit/providers/*`

5. Settings/config -> cockpitSettingsRoutes
- `/api/cockpit/settings/*`

6. Plane binding/sync -> planeRoutes
- `/api/cockpit/plane/*`

## Non-Goals
- No auth/rbac behavior change in this ticket.
- No queue persistence migration in this ticket.
- No storage backend migration in this ticket.

## Risks
- Hidden coupling through shared in-file state maps.
- Inadvertent response shape drift.
- Event stream side effects during route extraction.

## Mitigations
- Extraction-only commits with endpoint snapshots.
- Add smoke tests for key endpoints before and after extraction.
- Keep legacy wrappers temporarily for compatibility.

## Deliverables
- Route module skeletons created.
- Ownership map committed in docs.
- Extraction checklist completed.
