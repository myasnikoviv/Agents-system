# AGSYS-26R1 — Explicit Auth Register Flow + Tests

Date: 2026-04-09

## Implementation
- Added explicit endpoint: `POST /api/auth/register`
- Removed login bootstrap behavior (login no longer auto-creates first user)
- Register requires explicit tenant/workspace binding.

Code reference:
- `src/server/agentSystemBackend.ts`

## Behavior
### Register
Input:
- `email`
- `password`
- `tenantId`
- `workspaceId`
- optional `role`

Responses:
- `201` user created
- `409` duplicate email (`user_already_exists`)
- `400` for missing input (`email_and_password_required`, `tenant_and_workspace_required`)

### Login
Input:
- `email`
- `password`

Responses:
- `200` token issued for existing valid user
- `401` invalid credentials

## Test Evidence
Executed:
```bash
npx jest --runInBand src/runtime/__tests__/auth_register_flow.test.ts
```

Result:
- Test Suites: `1 passed`
- Tests: `1 passed`
- Exit code: `0`

Validated flow:
1. Register new user (`201`)
2. Duplicate register blocked (`409`)
3. Protected endpoint denied without token (`401`) in `AUTH_MODE=required`
4. Login successful (`200`) and token returned
5. Same protected endpoint allowed with token (`200`)

## Conclusion
AGSYS-26R1 acceptance criteria satisfied.
