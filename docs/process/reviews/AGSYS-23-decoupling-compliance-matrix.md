# AGSYS-23 Decoupling Compliance Matrix

| Control | Source of Truth | Runtime Implementation | Status |
|---|---|---|---|
| Pipeline selection mandatory | AGENTS.md + docs/pipelines/* | PipelineSelector + /api/chat selection | OK |
| Self-improvement loop enforced | docs/pipelines/* SIW dependency | SelfImprovementLoop integrated in /api/chat and /api/chat/approve | OK |
| Cross-editor continuity guard | Agent-system session continuity policy | PipelineStateService editorSource + resume validation | OK |
| Artifact-first evidence contract | postflight/evidence rules | EvidenceArtifactService + pipeline state evidence links | OK |
| Workbench lock policy | tool governance policy | AgentWorkbenchScheduler (isolated/share-safe/exclusive) | OK |
