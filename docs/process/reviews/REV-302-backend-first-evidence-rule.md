# REV-302 Backend-First Evidence Rule

## Rule
UI rendering is not accepted as primary proof for strategy correctness.

## Required Evidence Order
1. Backend logs/events with timestamps.
2. Deterministic fixture/test output.
3. UI overlays only as supporting evidence.

## Reviewer Action
Reject tickets where backend proof is missing and behavior is justified only by visuals.
