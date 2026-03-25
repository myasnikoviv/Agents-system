# Runner Backtest Day-1 Findings

## Summary
Reproducibility process exists but needs stricter run manifests to avoid mismatch between compared runs.

## Findings
1. Run comparisons can be ambiguous without locked config snapshot.
2. Missing standard report schema for run outcomes and anomalies.
3. Need explicit baseline tagging for each iteration.

## Recommendations
1. Add run manifest file per experiment (symbol, timeframe, range, strategy config hash).
2. Standardize run report template.
3. Require baseline/candidate pair id for every conclusion.

## Proposed Tickets
- RUN-401 Run Manifest Standard
- RUN-402 Standard Backtest Report Schema
- RUN-403 Baseline Pairing Enforcement
