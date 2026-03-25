# ARCH-102 Tooling Taxonomy v1

## Goal
Standardize script placement and naming to reduce discovery and ownership ambiguity.

## Taxonomy
- `scripts/plane/*`: Plane lifecycle and PM operations.
- `scripts/git/*`: git worktree, branch and recovery utilities.
- `scripts/ops/*`: infra/runtime health and drift checks.
- `scripts/ci_*`: CI entrypoints.
- `scripts/backfill_*`: one-off data/schema backfills.
- `scripts/debug_*`: temporary debug helpers (must be lifecycle-managed per ARCH-103).

## Naming Rules
- Lowercase snake_case for new scripts.
- Verb-noun style preferred (`check_dependency_drift.sh`, `collect_runtime_inventory.sh`).
- Prefix by domain where ambiguity exists.

## Migration Plan
1. Inventory current script set.
2. Tag each script: keep/move/deprecate.
3. Introduce aliases/wrappers for moved scripts for 1 sprint.
4. Remove wrappers after dependent docs are updated.

## Non-Breaking Constraints
- Keep existing public script names callable during transition.
- Document every move in changelog section of the ticket.
