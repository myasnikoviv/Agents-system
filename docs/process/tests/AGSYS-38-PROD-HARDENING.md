# AGSYS-38 Production Hardening Evidence Pack

Date: 2026-04-17  
Owner: PM Orchestrator / DevOps / QA  
Scope: Sprint 38 remediation hardening gates for architecture, infra proxying, smoke coverage, and distributed-profile enforcement.

## Gate Summary
- `AGSYS-3820` (LB routing map): PASS
- `AGSYS-3821` (reference reverse-proxy config): PASS
- `AGSYS-3831` (distributed-profile sqlite guardrail): PASS
- `AGSYS-3840` (hard CI gates): PASS
- `AGSYS-3841` (infra smoke suite): PASS
- `AGSYS-3812` (health/readiness standardization): PASS

Residual critical stream:
- none (as of 2026-04-17, `AGSYS-3850` closed)

## Executed Commands and Observed Results

### 1) CI hardening gates
Command:
```bash
npm run infra:ci:gates
```
Observed result:
- PASS
- Included:
  - backend workspace build matrix
  - `apps/control-api` build
  - `apps/runtime-engine` build
  - distributed profile guardrail checks for `local-self-hosted` and `cloud-ready`

### 2) Distributed profile guardrail (explicit)
Commands:
```bash
npm run infra:validate:distributed-profile -- local-self-hosted
npm run infra:validate:distributed-profile -- cloud-ready
```
Observed result:
- PASS for both profiles
- Confirmed no `sqlite` in shared distributed backends.

### 3) API smoke + UI/proxy smoke (suite)
Command:
```bash
npm run infra:smoke:suite:mocks
```
Observed result:
- PASS
- Covered:
  - Control API health + readiness dispatch
  - Runtime engine health + ready + dispatch endpoint
  - Client root availability
  - Proxy path routing (`/`, `/api/health`, `/runtime/health`)

### 4) Failure behavior (non-zero exit)
Command:
```bash
CONTROL_API_BASE_URL=http://127.0.0.1:19999 bash scripts/infra/smoke/control_api_health.sh
```
Observed result:
- FAIL as expected with non-zero exit (`exit code 7`)
- Confirms fail-fast semantics for smoke checks.

## Artifact Index
- Routing map and topology:
  - `docs/process/designs/AGSYS-3820-lb-routing-map.md`
- Reference proxy configuration:
  - `infra/proxy/nginx.reference.conf`
- Proxy smoke:
  - `scripts/infra/smoke_proxy_paths.sh`
- Distributed guardrail:
  - `scripts/infra/validate_distributed_profile_guardrail.sh`
- Hardening CI workflow:
  - `.github/workflows/hardening-gates.yml`
- Hardening gates runner:
  - `scripts/infra/ci_hardening_gates.sh`
- Infra smoke suite:
  - `scripts/infra/smoke/README.md`
  - `scripts/infra/smoke/run_suite.sh`
  - `scripts/infra/smoke/run_suite_with_mocks.sh`

## PM Closure Note (Gate Decision)
Decision: **GO** for moving into next sprint execution (`35.5B`) under remediation governance.

Rationale:
- Hardening gate stack for routing, proxying, profile guardrails, CI checks, and smoke coverage is in place and passing.
- `AGSYS-3850` is closed with reproducible Postgres-only runtime evidence (auth/session/project/thread/state provisioning path).
