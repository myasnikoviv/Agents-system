# AGSYS-2501 Service Boundaries

## Goal
Define unambiguous platform boundaries for Sprint 25 foundation work.

## Current Problem
- `src/server/agentSystemBackend.ts` owns many domains at once.
- Runtime coordination and API concerns are coupled.
- Stateful concerns are mixed between memory, filesystem, SQLite, and Redis.

## Target Service Map

1. control-plane-api
- Responsibility: authenticated API surface for cockpit/chat/admin operations.
- Owns: request auth context, RBAC checks, API composition, tenant/workspace/project selection.
- Must not own: runtime execution internals, queue scheduling internals, storage implementation details.

2. runtime-dispatcher
- Responsibility: pipeline/stage dispatch policy and task scheduling.
- Owns: enqueue/dequeue/reassign/retry/cancel semantics, priority ordering.
- Must not own: worker process lifecycle, governance rule evaluation.

3. worker-orchestrator
- Responsibility: worker lifecycle and execution assignment.
- Owns: spawn/heartbeat/health/state transitions, worker identity bindings.
- Must not own: API auth, policy authoring UI, artifact persistence policy.

4. governance-service
- Responsibility: rules/loops/evaluators/policy management and phase evaluation.
- Owns: governance catalogs, project policy bindings, loop/rule lifecycle, enforcement decisions.
- Must not own: chat transport, queue mechanics, frontend presentation.

5. telemetry-service
- Responsibility: unified event/audit ingestion and query.
- Owns: event stream normalization, trace correlation, audit timeline read APIs.
- Must not own: business policy decisions.

6. artifact-service
- Responsibility: artifact metadata and blob lifecycle.
- Owns: artifact put/get/list contracts and storage abstraction routing.
- Must not own: governance enforcement logic.

## Canonical Contracts (v1)

### Control Plane -> Runtime Dispatcher
- `dispatch.run.start` `{ tenantId, workspaceId, projectId, runId, pipelineId, stages[] }`
- `dispatch.task.control` `{ action, taskId, actorId }`

### Runtime Dispatcher -> Worker Orchestrator
- `worker.task.assign` `{ workerId, taskId, runId, projectId, stageId, payload }`
- `worker.task.retry` `{ taskId, retryCount, reason }`

### Control Plane -> Governance Service
- `governance.rule.*` CRUD
- `governance.loop.*` CRUD + force-run
- `governance.policy.project.*` read/update

### Runtime Dispatcher/Worker -> Telemetry Service
- `event.emit` `{ eventType, runId, projectId, chainId, actor, payload, timestamp }`

### Worker/Governance/Control Plane -> Artifact Service
- `artifact.put` `{ tenantId, projectId, runId, type, contentType, dataRef }`
- `artifact.get` `{ artifactId }`

## Ownership Guardrails
- One domain owner per module namespace.
- Cross-service access only through explicit contract APIs (no deep imports across boundaries).
- Service modules expose interfaces from `src/runtime/services/<domain>/index.ts` only.

## Initial Module Layout
- `src/runtime/services/control-plane/*`
- `src/runtime/services/runtime-dispatcher/*`
- `src/runtime/services/worker-orchestrator/*`
- `src/runtime/services/governance/*`
- `src/runtime/services/telemetry/*`
- `src/runtime/services/artifacts/*`

## Done Criteria
- Boundaries are documented and approved.
- Every existing endpoint maps to one owning service.
- No endpoint marked as "shared ownership".
