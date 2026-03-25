# ARCH-103 Debug Script Hygiene v1

## Policy
Temporary debug artifacts are allowed only with explicit lifecycle metadata.

## Required Header for Debug Scripts
- Owner
- Purpose
- Created at
- Delete-by date
- Ticket reference

## Classification
- `KEEP`: promoted to maintained utility.
- `MIGRATE`: move to proper domain folder and rename by taxonomy.
- `DELETE`: temporary experiment no longer needed.

## Enforcement
- PM audit must flag debug scripts without metadata.
- Reviewer rejects PRs adding debug files without delete-by date.

## Cleanup Cadence
- Weekly cleanup window.
- Expired debug scripts are removed or explicitly extended by PM decision.
