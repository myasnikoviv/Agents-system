# Test Plan & Report: TKT-62 Diagnostics

## Cases & Results
| Case | Result | Evidence |
|---|---|---|
| Classify `insufficient_quota` | PASS | `openai_diagnostics.test.ts` |
| Classify missing-credentials auth issue | PASS | `openai_diagnostics.test.ts` |
| Classify rate-limit issue | PASS | `openai_diagnostics.test.ts` |
| Probe success path returns `ok=true` | PASS | `openai_diagnostics.test.ts` |
| Probe failure path returns classified category | PASS | `openai_diagnostics.test.ts` |

## Command
- `npx jest src/runtime/__tests__/openai_diagnostics.test.ts --runInBand`

## Status
PASS
