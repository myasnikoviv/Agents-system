# RUN-403 Baseline Pairing Enforcement

## Objective
Every variant run must be paired with an explicit baseline run for meaningful comparison.

## Rules
- `baseline_run_id` is mandatory for comparison reports.
- If missing baseline: run is marked `comparison_invalid`.
- Pairing metadata must be present in report and manifest.
