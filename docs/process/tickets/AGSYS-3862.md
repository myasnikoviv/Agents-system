# Ticket: AGSYS-3862
## Self-Healing Supervisor and Crash Forensics

**Status**: TODO
**Priority**: HIGH
**Owner**: Техно-Рятівник (DevOps Engineer)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати self-healing policy: auto-restart/service backoff + crash metadata capture (reason, exit code, last logs, restart count).

### Acceptance Criteria
- [ ] deterministic restart/backoff policy documented and enforced
- [ ] crash diagnostics artifact generated per failure
- [ ] incident timeline queryable from control plane

### Evidence Required
- runbook link
- failure simulation logs (pass/fail)
