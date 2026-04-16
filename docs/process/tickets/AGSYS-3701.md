# Ticket: AGSYS-3701
## Define target repository topology

**Status**: DONE (Design Schema Created)
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Майстер Креслень (Solution Architect)

### Description
Зафіксувати цільову структуру repo. 

### Target Structure
- `apps/`: Deployable units (frontend, control-plane).
- `packages/`: Shared domain logic (runtime, governance, billing, memory, shared).

### Acceptance Criteria
- [ ] є затверджена цільова topology схема
- [ ] описано призначення кожної top-level зони
- [ ] визначено migration path з поточної структури
