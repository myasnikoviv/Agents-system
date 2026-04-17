# Ticket: AGSYS-3719
## Isolate blob storage from SQL text fields

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Підготувати migration strategy away from saving base64/blob directly in SQL text fields.

### Acceptance Criteria
- [ ] blob storage strategy визначена (FileSystem or S3)
- [ ] SQL лишається лише для metadata
- [ ] є migration plan / partial implementation (POC)
- [ ] storage provider interface updated
