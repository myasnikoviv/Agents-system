# Ticket: AGSYS-3860
## Orchestration Platform ADR (Kubernetes-first)

**Status**: DONE
**Priority**: CRITICAL
**Owner**: Майстер Креслень (Solution Architect)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Підготувати ADR з вибором orchestration stack (Kubernetes-first), boundaries control-api/runtime-engine/client, service discovery strategy, restart strategy.

### Acceptance Criteria
- [x] ADR містить цільову topology і rollout stages
- [x] описані alternatives/trade-offs і фінальне рішення
- [x] визначені SLO/SLI для core services

### Evidence Required
- `docs/process/designs/AGSYS-3860-orchestration-adr.md`
- reviewer sign-off note

### Implementation Notes
- Created orchestration ADR:
  - `docs/process/designs/AGSYS-3860-orchestration-adr.md`
- Final decision:
  - Kubernetes-first orchestration architecture.
  - Native K8s service discovery + probes + HPA + centralized observability baseline.
  - ZooKeeper not required as core component for current target architecture.

### Verification Evidence (2026-04-17)
- ADR includes:
  - target service boundaries and topology
  - rollout stages A-D
  - alternatives + trade-offs + final decision
  - SLI/SLO baseline for `control-api`, `runtime-engine`, `client-app`

### Reviewer Sign-off
- Reviewer: pending (Solution Architect + DevOps Engineer)
- Note: technical draft accepted for execution planning; formal sign-off to be attached during AGSYS-3864/3863 integration review.
