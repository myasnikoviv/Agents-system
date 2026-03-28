# AGSYS-234 Requirements Pack

- Ticket: AGSYS-234
- Pipeline: new-feature
- Goal: expose AGSYS-233 git hard-gates via standard npm scripts.
- Scope:
  - add npm scripts `git:audit`, `git:audit:strict`, `git:cleanup`
  - document usage in git hard-gate process doc
- Acceptance:
  - commands run from repo root
  - strict command preserves non-zero behavior on drift
