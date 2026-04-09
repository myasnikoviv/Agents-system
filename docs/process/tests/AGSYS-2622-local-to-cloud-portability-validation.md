# AGSYS-2622 — Local-to-Cloud Portability Validation

Date: 2026-04-09

## Scope
Confirm runtime portability across local/self-hosted and cloud-ready profiles without runtime rewrite.

## Evidence
### 1) Runtime profile files exist
- `config/runtime-profiles/local-self-hosted.env`
- `config/runtime-profiles/cloud-ready.env`

### 2) Profile values are backend-only switches (no runtime logic fork)
Local profile:
- `COCKPIT_SECRETS_BACKEND=sqlite`
- `COCKPIT_OBJECT_STORAGE_BACKEND=sqlite`
- `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND=sqlite`
- `RUNTIME_SHARED_WORKER_STATE_BACKEND=sqlite`
- `AUTH_MODE=optional`

Cloud-ready profile:
- `COCKPIT_SECRETS_BACKEND=postgres`
- `COCKPIT_OBJECT_STORAGE_BACKEND=postgres`
- `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND=redis`
- `RUNTIME_SHARED_WORKER_STATE_BACKEND=redis`
- `AUTH_MODE=required`

### 3) Infrastructure packaging validates
```bash
docker compose -f docker-compose.runtime.yml config
```
Result: PASS (`OK`, exit code 0)

### 4) Runtime abstraction test passes
`src/runtime/__tests__/runtime_infrastructure_profile.test.ts` passed in the AGSYS-2621 command run.

## Acceptance Criteria Check
- same runtime logic used in both profiles: PASS (same code path with env-driven backend resolver)
- local profile works: PASS (profile file present and used in runtime profile tests)
- cloud profile config resolves: PASS (compose config validated + cloud profile file present)
- infra dependencies abstracted, not hardcoded: PASS (`RuntimeInfrastructureProfile` abstraction + tests)

## Conclusion
AGSYS-2622 acceptance criteria are satisfied.
