# Pre-Sprint 37 Gate Report: Repository Topology & Service Architecture Audit

## 1. Executive Summary
- **Current Architecture Type**: Modular Monolith (Logical), Monolith (Physical), Pseudo-Microservices (Docker).
- **Repo State**: Single Monorepo without physical internal boundaries (no `packages/` or `libs/`). 
- **Main Issues**: 
    - **God Object**: `agentSystemBackend.ts` (4.9K LOC) handles everything from API to Runtime to Billing.
    - **Build Inefficiency**: Docker builds copy the entire 400MB+ repo instead of isolated components.
    - **Data Contention**: Loosely defined data ownership with blobs stored in SQL.
    - **Deployment Coupling**: All components are deploed as a single unit, despite logic separation.

---

## 2. Repository Structure
- **Root**: Clean top-level, but missing `apps/` or `services/` separation.
- **`src/runtime/`**: Well-organized into sub-domains (billing, governance, memory, etc.), but not physically isolated as NPM packages.
- **`src/server/`**: Contains the main API and storage adapters. High coupling with `runtime`.
- **`frontend/`**: Physically separate Vite/React app, located at the root.

---

## 3. Service Topology
- **Control Plane**: Logically independent, but physically shares the binary with the Runtime.
- **Runtime Plane**: Orchestrated instance of the same backend.
- **Worker System**: Managed dynamically by `ControlPlaneRuntimeManager`.
- **External Adapters**: Supports Local Process and Docker adapters for service orchestration.

---

## 4. Runtime Model
- **Process Model**: Single-process primary nodes, but spawns sub-processes for agent execution.
- **Communication**:
    - **Intra-node**: Dynamic imports and direct calls.
    - **Inter-node**: Redis and HTTP.
- **Isolation**: Weak. Sub-processes share the same environment unless explicitly sandboxed.

---

## 5. Data Layer
- **DB Types**: SQLite (default), Postgres (optional), Redis (telemetry/queue).
- **Ownership**: **FAIL**. Multiple services connect to the same strings/files without a gateway.
- **Blob Storage**: **FAIL**. Base64 blobs stored in SQL text fields (Cockpit Objects).

---

## 6. Docker & Build
- **Dockerfiles**: Dedicated files for planes exist, but they are clones.
- **Build Context**: **FAIL**. All Dockerfiles use `.` as context and `COPY . .`. This forces a full rebuild for any change.
- **Efficiency**: Low. Image sizes are likely larger than necessary (>1GB).

---

## 7. CI/CD
- **Pipelines**: No visible CI workflows in the repo.
- **Selective Builds**: Not possible with current Docker structure.

---

## 8. Shared Code Analysis
- **Contracts**: Soft contracts (TS Types). No versioned SDKs or internal libraries.
- **Spaghetti Level**: Medium. High coupling between API handlers and Runtime internals.

---

## 9. Infra Readiness
- **Multi-tenant**: Database schema has `tenant_id` fields, but logic implementation is inconsistent.
- **Cloud Ready**: Partially. Docker support exists, but lack of k8s/terraform configs makes it "Single-Node" leaning.

---

## 10. Bottlenecks
1. **Developer Velocity**: Refactoring `agentSystemBackend.ts` is high-risk.
2. **Cold Start**: Massive image sizes and `npm ci` in Docker.
3. **Database Bloat**: SQLite WAL files will explode due to Base64 blobs.

---

## 11. Architecture Classification
- [ ] Monolith
- [x] Modular Monolith (Pseudo-Microservices)
- [ ] Monorepo Microservices (logical)
- [ ] Real Distributed Microservices

---

## 12. Recommendations
- **Short-term**:
    - Split `agentSystemBackend.ts` into domain-specific route files (already partially done via `src/server/routes`, but logic is still leaked).
    - Optimize Docker build context (use `.dockerignore` effectively).
- **Mid-term**:
    - Migrate to `npm workspaces` or `turborepo`.
    - Extract `src/runtime` into a separate package `@system/runtime`.
    - Move blob storage to S3 or FileSystem with SQL metadata only.
- **Long-term**:
    - Move to independent deploy units (Microservices) for Billing and Asset Registry.

---

## 13. Decision Gate Answers
1. **Monorepo vs Multi-repo?** Keep **Monorepo** but transition to **Multi-package** (Workspaces).
2. **Deploy units?** Split **Frontend**, **Control Plane**, and **Runtime Plane** into distinct Docker build contexts.
3. **Shared packages?** Extract **Telemetry**, **Auth**, and **Types** into shared libs.
4. **Bottlenecks?** SQL blob storage and the "Backend Monolith" code size.
5. **Minimal reorg?** Adopt `npm workspaces` and move components into `packages/*`.

---

**Audit Completed by: Дослідник Шляху (Research Agent)**
**Approved by: Сокіл-Координатор (PM Orchestrator)**
**Date: 2026-04-16**
