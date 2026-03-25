# Trader Analyst Day-1 Findings

## Summary
Core strategy understanding is strong, but operational alignment between intended wave logic and implementation verification still needs tighter formalization.

## Findings
1. Frequent disputes about wave start/end and retrace/result matching imply missing formal invariants doc.
2. Several edge rules (require break, max opposite, ratio, angle) need one authoritative precedence table.
3. Timing semantics across blocks (HTF/LTF transitions) require explicit contract examples.

## Recommendations
1. Create canonical strategy invariants spec with examples.
2. Define precedence order for wave filters.
3. Add reference scenarios with expected outcomes (timestamped).

## Proposed Tickets
- TRD-501 Strategy Invariants Spec v1
- TRD-502 Wave Filter Precedence Table
- TRD-503 HTF-LTF Timing Contract Examples
