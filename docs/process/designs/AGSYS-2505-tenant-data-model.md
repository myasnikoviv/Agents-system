# AGSYS-2505 Tenant Data Model

## Objective
Define canonical SaaS tenancy model and isolation contract for runtime.

## Entity Hierarchy
- `tenant` -> top-level business/account isolation boundary.
- `workspace` -> tenant-local operational context.
- `project` -> workload and policy scope inside workspace.
- `run` -> immutable execution session within project.
- `agent` -> execution actor inside run.

## Relationships
- One tenant has many workspaces.
- One workspace belongs to exactly one tenant and has many projects.
- One project belongs to exactly one workspace and has many runs.
- One run belongs to exactly one project and has many agent actions.

## Isolation Rules
- Primary namespace key template:
  - `tenant:{tenantId}:workspace:{workspaceId}:project:{projectId}:{domain}`
- Domain-level scoping required for:
  - memory
  - queue
  - artifacts
  - governance/policies
- Cross-tenant reads/writes are forbidden by key construction (not by convention).

## Runtime Contract
- Runtime context must carry `tenantId`, `workspaceId`, `projectId`, `runId`.
- Missing identifiers are auto-resolved to deterministic defaults and validated.
- Unsafe identifiers (`..`) are rejected by boundary validator.

## Initial Implementation Surface
- `src/runtime/tenancy/TenantContext.ts`
- `src/runtime/context/RunContext.ts` enriched with tenancy block
