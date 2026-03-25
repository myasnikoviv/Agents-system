# Code Reviewer Day-1 Findings

## Summary
Main risk is behavioral drift in strategy logic due to rapid iterative fixes across backend + visuals.

## Findings
1. High-churn areas: wave detection, wait/set-manip timing, overlays.
2. UI symptoms have repeatedly masked backend sequencing issues.
3. Contract drift happens frequently and needs stricter pre-merge checklist.

## Recommendations
1. Add reviewer checklist focused on ordering invariants and timestamp coherence.
2. Require backend evidence first for every visual discrepancy.
3. Enforce pre-merge contract checks for touched blocks.

## Proposed Tickets
- REV-301 Invariant Review Checklist
- REV-302 Backend-First Evidence Rule
- REV-303 Pre-Merge Contract Gate Hardening
