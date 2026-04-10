# AGSYS-3127 Data Classification

## PII Identified
- `user.email`
- `secrets.key` / provider credentials metadata

## Sensitive Data Marked
- Billing subscription and usage artifacts
- Runtime audit and trace records

## Policies Defined
- Access scope policy: tenant/workspace/user boundaries are mandatory.
- Retention policy: operational ledgers/logs retained for auditability window.
- Minimization policy: only necessary operational metadata is stored.

## API
- `GET /api/cockpit/compliance/data-classification`
