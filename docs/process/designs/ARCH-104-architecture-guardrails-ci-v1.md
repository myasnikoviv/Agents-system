# ARCH-104 Architecture Guardrails in CI v1

## Objective
Catch architecture drift before merge.

## Guardrails
1. Ticket brief presence for every process ticket id referenced in changed files.
2. No direct modification to strategy-critical runtime code without tests touched in same change-set.
3. Contract manifest checks must pass for block logic changes.
4. No direct push to main from role branches.

## CI Rollout
- Phase 1 (warn): report violations, do not block.
- Phase 2 (soft fail): block on critical violations.
- Phase 3 (hard fail): block all defined violations.

## Script Hooks
- `scripts/hardening_gates.sh`
- `scripts/ci_check.sh`

## Exceptions
- Emergency hotfix requires PM + GitFlow override note with rollback plan.
