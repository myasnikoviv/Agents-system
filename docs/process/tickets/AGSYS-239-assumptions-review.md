# AGSYS-239 Assumptions Review

1. Contract guard should validate normalized response body (starting at first `Active role:`) rather than arbitrary prefixed prose.
2. In `multiple_agents`, SSE is the primary source for agent messages in UI; API `message` should not be appended live to avoid duplicates.
3. Formatting violations (`contract_fail`) are non-fatal and must not be treated as runtime outage.
4. Sticky right-panel header improves observability without changing backend behavior.
