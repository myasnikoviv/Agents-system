# Ticket: AGSYS-3718
## Define domain data ownership map

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Майстер Креслень (Solution Architect)

### Description
Описати ownership по даних для кожного домену.

### Domains
- runtime (Execution, State)
- governance (Rules, Policies)
- billing (Usage, Limits, Quotas)
- memory (Registry, Objects)
- control plane (System Config, Auth)

### Acceptance Criteria
- [ ] існує ownership matrix document
- [ ] не залишилося “shared uncontrolled” зон як policy
- [ ] зрозуміло, хто читає/пише що (Contracts updated)
