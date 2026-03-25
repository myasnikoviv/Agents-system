# QA-201 Regression Matrix for Strategy #2 Chain (v1)

## Scope
Chain under test:
1. Liquidity Filter (HTF)
2. Find Wave (HTF)
3. Find Effort Bar (HTF)
4. Wait Test (HTF)
5. Set Manip Level (HTF)
6. Volatility Damping (LTF)
7. Detect Effort At Level (LTF)
8. Weak Resumption (LTF)
9. Build Stop Limit Trade (LTF)

## Case Table
| Case ID | Scenario | Fixture Window | Expected |
|---|---|---|---|
| QA201-001 | Happy path LONG | PENGUSDT.P 30d baseline | full chain PASS and trade built |
| QA201-002 | Happy path SHORT | PENGUSDT.P 30d baseline | full chain PASS and trade built |
| QA201-003 | Wave detected, no effort | focused wave fixture | stops at Find Effort Bar |
| QA201-004 | Effort found, no wait test | HTF delayed test fixture | stops at Wait Test |
| QA201-005 | Wait test pass, volatility not damped | LTF high range fixture | stops at Volatility Damping |
| QA201-006 | Damping pass, no effort-at-level | LTF no-touch fixture | stops at Detect Effort At Level |
| QA201-007 | Timing consistency | timestamp contract fixture | ordered block timestamps monotonic |
| QA201-008 | Duplicate trade guard | duplicate trigger fixture | no duplicate final trade |
| QA201-009 | Payload volume guard | high session volume fixture | no payload cutoff-induced state corruption |
| QA201-010 | Contract drift guard | modified block hash fixture | hard fail with drift message |

## Evidence Requirements
- Run manifest id
- Export bundle/json
- Screenshot for selected chain
- Block flow timestamps

## Notes
- TRD-501/TRD-502/TRD-503 specific cases are blocked until user provides trader context update.
