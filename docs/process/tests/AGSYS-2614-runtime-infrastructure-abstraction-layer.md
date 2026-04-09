# AGSYS-2614 — Runtime Infrastructure Abstraction Layer

## Scope
- Centralized config-driven provider selection
- Runtime services consume abstraction profile instead of scattered env parsing
- Local/cloud provider combinations supported without runtime logic rewrite

## Added
- `src/runtime/infrastructure/RuntimeInfrastructureProfile.ts`
- `GET /api/cockpit/runtime/infrastructure-profile`
- Design doc: `docs/process/designs/AGSYS-2614-runtime-infrastructure-abstractions.md`

## Validation
- `npx jest --runInBand src/runtime/__tests__/runtime_infrastructure_profile.test.ts src/runtime/__tests__/project_dispatch_queue.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts`
