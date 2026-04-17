# Ticket: AGSYS-3868
## DR, Backup, and Chaos-lite Reliability Drills

**Status**: DONE
**Priority**: HIGH
**Owner**: Ловець Багів (TDD QA)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Провести DR/backup drills і chaos-lite сценарії: service failure, node eviction, dependency outage.

### Acceptance Criteria
- [x] backup/restore workflow validated with documented RTO/RPO
- [x] chaos-lite scenarios executed with recovery evidence
- [x] postmortem templates and runbooks updated

### Evidence Required
- drill report path
- command outputs and observed recovery times

### Evidence
- Drill report: `docs/process/runs/AGSYS-3868-drill-report.md`
- Drill automation script: `scripts/infra/drills/chaos_lite_reliability_drills.sh`
- Updated runbook/template:
  - `docs/process/ops/incident-playbook.md`
  - `docs/process/ops/postmortem-template-agsys-3868.md`
