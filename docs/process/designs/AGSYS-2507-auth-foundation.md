# AGSYS-2507 Auth Foundation

## Implemented Foundation
- Added SQLite auth tables:
  - `auth_users`
  - `auth_sessions`
- Added API endpoints:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Added bearer token parsing and session validation in backend.
- Added tenant/workspace binding in authenticated identity.
- Propagated authenticated context (`tenantId`, `workspaceId`, `userId`) into `/api/chat` runtime launch payload.

## Current Notes
- First login can bootstrap initial owner user if user table is empty.
- Session TTL is configurable via `AUTH_SESSION_TTL_HOURS`.
- Password hashing uses SHA-256 with `AUTH_SECRET` salt (baseline; future hardening can replace with Argon2/Bcrypt).
