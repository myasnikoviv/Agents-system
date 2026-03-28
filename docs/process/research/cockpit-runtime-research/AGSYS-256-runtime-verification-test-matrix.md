# AGSYS-256 — Runtime Verification Test Matrix

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Purpose
Define a reproducible verification matrix for Cockpit runtime behavior across execution modes and message patterns.

## 2) Axes
- Modes: `mock`, `quasi-linear`, `multiple_agents`
- Conversation depth: `1-step`, `2-step`, `3-step`, `5-step`
- Runtime semantics: handoff, parallelism, retries/guards, isolation, context carryover
- Providers: `codex-cli`, `openhands+gemini-2.5-flash`
- Persistence: reload/restart, project switch, chat switch

## 3) Core matrix
| ID | Mode | Steps | Focus | Expected Result |
|---|---|---:|---|---|
| M1 | mock | 1 | baseline response | deterministic synthetic response, no real handoff |
| M2 | quasi-linear | 1 | stage chain | ordered stage progression, bounded completion |
| M3 | multiple_agents | 1 | PM entry + first handoff | explicit active role + handoff event |
| M4 | multiple_agents | 2 | continuity | second answer addresses second prompt, no stale carryover |
| M5 | multiple_agents | 3 | cross-agent flow | >=2 distinct agent handoffs observable |
| M6 | multiple_agents | 5 | loop stability | no infinite retry/guard loop; terminal completion |
| M7 | quasi-linear | 3 | guard resilience | guard correction bounded; no duplicate finals |
| M8 | multiple_agents | 3 | project isolation | context strictly scoped to selected project/chat |
| M9 | multiple_agents | 3 | parallel branches | if parallel enabled, independent branch statuses visible |
| M10 | multiple_agents | 2 | provider swap | provider-specific formatting handled, no technical leakage |
| M11 | multiple_agents | 2 | reload persistence | chat/project state survives page reload |
| M12 | multiple_agents | 2 | restart persistence | runtime state restored after backend restart |

## 4) Pass/fail criteria
- Pass only if output is both:
  - correct semantically (answers latest user request), and
  - correct operationally (expected events/states visible and bounded).
- Fail if any of:
  - duplicate final messages,
  - stale-context answer,
  - unbounded retries,
  - hidden handoff (expected but not observable),
  - context leakage across project/chat.

## 5) Evidence channels
- UI chat transcript
- SSE/event feed timeline
- backend logs (run + stage IDs)
- provider/executor trace summary

## 6) Stop condition
Research artifact only. No new test harness implementation in this task.
