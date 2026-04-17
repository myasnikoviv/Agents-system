# Ticket: AGSYS-3861
## Service Locator + Topology Health API

**Status**: TODO
**Priority**: HIGH
**Owner**: Кодоковаль (Developer)
**Assignee**: Кодоковаль (Developer)

### Description
Реалізувати сервіс-локатор/registry view для відображення активних сервісів, версій, health/readiness статусів і endpoint metadata.

### Acceptance Criteria
- [ ] API повертає перелік сервісів з readiness/liveness/state
- [ ] topology snapshot містить dependencies і error surface
- [ ] dashboard-compatible JSON schema документована

### Evidence Required
- API contract/design link
- smoke output for topology endpoint
