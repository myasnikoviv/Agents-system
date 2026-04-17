# AGSYS-3869 — Branch Protection Audit Note

## Date
2026-04-17

## Implemented required checks in repo CI
- `.github/workflows/hardening-gates.yml` -> check name: `hardening-gates`
- `.github/workflows/smoke-gates.yml` -> check name: `smoke-gates`

## Repository-level blocker
- This environment does not have GitHub admin tooling (`gh` CLI unavailable, no settings API token configured).
- Because of that, branch protection for `main` cannot be verified/applied from this session.

## Admin apply checklist (GitHub UI)
1. Open repository settings -> Branches -> Branch protection rules -> `main`.
2. Enable "Require status checks to pass before merging".
3. Mark required checks:
   - `hardening-gates`
   - `smoke-gates`
4. Enable "Do not allow bypassing the above settings".

## Verification note template
- Create a PR with one failing check and confirm merge button is blocked.
- Attach screenshot with failing required check and blocked merge control.

## Local pre-check
- Command: `bash scripts/infra/smoke/run_suite_with_mocks.sh`
- Result: PASS (control-api health/readiness, runtime health/ready/dispatch, client availability, proxy paths).
