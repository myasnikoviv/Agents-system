# AGSYS-260 — Task Completion Verification Loop Brief

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Objective
Define a machine-checkable loop that validates "task completed" claims before final closure.

## 2) Candidate loop
1. PM marks candidate completion.
2. Verifier collects evidence:
- pipeline compliance
- agent/handoff trace
- artifacts/docs references
- test/postflight evidence
3. Verifier computes structured result.
4. PM either:
- confirms closure, or
- reopens with missing-evidence report.

## 3) Minimum machine-checkable schema
```json
{
  "ticketId": "AGSYS-XXX",
  "status": "pass|fail|partial",
  "checks": [
    {"name": "pipeline_compliance", "result": "pass|fail", "evidence": []},
    {"name": "handoff_trace", "result": "pass|fail", "evidence": []},
    {"name": "tests_postflight", "result": "pass|fail", "evidence": []},
    {"name": "artifact_traceability", "result": "pass|fail", "evidence": []}
  ],
  "missing": [],
  "decision": "close|reopen"
}
```

## 4) Options
- PM self-check: faster, lower isolation
- Dedicated verifier role: stronger quality gate, slightly higher latency

## 5) Preferred research conclusion
Use dedicated verifier path for closure-critical tickets; allow PM self-check only for low-risk informational tasks.

## 6) Stop condition
Research artifact only. No verifier service implementation in this task.
