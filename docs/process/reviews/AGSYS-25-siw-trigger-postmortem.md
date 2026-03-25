# AGSYS-25 SIW Trigger Postmortem + Executable Prevention Controls

## Incident Summary
Historically, Self-Improvement Loop (SIW) could be skipped because it was documented in pipeline text but not enforced in runtime execution path.

## Root Cause
1. SIW lived in process docs, not in mandatory server-side post-stage hooks.
2. Chat endpoints closed execution without deterministic retrospective/proposal artifacts.
3. No quality score gate existed in runtime response contract.

## Prevention Controls (Implemented)
1. `/api/chat` now always executes `runSelfImprovementLoop(...)` after run completion.
2. `/api/chat/approve` also executes SIW on continuation/approval flow.
3. Runtime returns SIW payload (`qualityScore`, `findings`, `actions`) to cockpit.
4. SIW writes durable artifacts:
   - `docs/process/retrospectives/<ticket>-siw-auto.md`
   - `docs/process/instructions/<ticket>-siw-improvement.md`
5. Pipeline state `evidenceLinks` now includes SIW artifact links.

## Verification
- Unit tests for core governance modules passed.
- Runtime endpoints produce SIW artifact paths in response payload.

## Follow-up
- Add CI assertion that any completed/approved chat run contains SIW artifacts in response/evidence links.
