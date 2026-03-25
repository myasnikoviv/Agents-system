# Docs Lifecycle Labels

## Labels
- `DRAFT`: under active authoring, not canonical.
- `ACTIVE`: approved and referenced in process/index.
- `DEPRECATED`: replaced by newer canonical artifact.
- `ARCHIVED`: historical record only.

## Placement
Each process doc should contain a lifecycle marker near top:
`Lifecycle: ACTIVE`

## Transition Rules
- DRAFT -> ACTIVE: PM acceptance + reviewer confirmation.
- ACTIVE -> DEPRECATED: replacement doc link is mandatory.
- DEPRECATED -> ARCHIVED: after 1 sprint grace period.
