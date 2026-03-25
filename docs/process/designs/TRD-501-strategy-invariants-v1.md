# TRD-501 Strategy Invariants v1

## Scope
Canonical behavioral invariants for Strategy #2 execution chain (HTF/LTF).

## Wave Invariants
1. Retrace leg and result leg are opposite directions.
2. If `require_break=true`, selected result leg must break retrace extreme by terminal bar (not internal spike-only).
3. Result leg emitted to downstream blocks must be canonical for that candidate context.
4. Retrace leg must be singular canonical base leg in payload for the selected result leg.

## Effort Invariants
1. Effort candidates are searched only inside active result leg.
2. In `ALL` mode, each effort candidate branches into independent session path.
3. Corridor levels must be direction-consistent with selected effort bar contract.

## Test/Manipulation Invariants
1. `Wait Test` is first HTF close inside effort corridor after effort context is known.
2. `Set Manip Level` must be anchored to resolved test context and execute at same resolved HTF checkpoint (no delayed synthetic timestamp).

## LTF Continuation Invariants
1. Volatility damping validates calm segment, not random isolated bar.
2. Detect-effort-at-level and weak-resumption must consume same manipulation context lineage.

## Execution Contract Invariants
1. Ticket pipeline: `git_preflight -> implementation -> verification -> handoff`.
2. Every completed ticket must carry artifact references in ticket comments.

## Follow-up Tickets
- `TRD-502` precedence table (formal ordering between filters)
- `TRD-503` HTF-LTF timing contract examples
