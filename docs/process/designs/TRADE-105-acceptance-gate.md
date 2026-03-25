# TRADE-105 Acceptance Gate: Project-Agnostic Runtime Milestone

## Goal
Define objective acceptance gates for declaring Agent Cockpit runtime project-agnostic ready.

## Scope
Milestone covers runtime extraction wave `TRADE-95` and children `TRADE-96..105`.

## Mandatory Gate Categories

### 1. Reliability Gate (Hard)
Pass conditions:
1. CLI/API smoke path succeeds (`health`, `chat send`, `approve continue`) in ticket worktree.
2. UI smoke path succeeds in Cockpit (`task submit`, `stage progression`, `approval gate`, `completion`).
3. No blocker defects (`P0/P1`) remain open for extraction scope.

Evidence sources:
- `docs/process/tests/TRADE-101-manifest-contract-suite.md`
- `docs/process/tests/TRADE-102-e2e-smoke-matrix.md`

### 2. Governance Gate (Hard)
Pass conditions:
1. All mutations executed from ticket branch/worktree (no direct `main` mutation).
2. Valid preflight token present for each mutating ticket.
3. Pipeline-state artifacts exist for each completed ticket.

Evidence sources:
- `docs/process/git/preflights/TRADE-*.env`
- `docs/process/pm/pipeline-state/TRADE-*.md`

### 3. Portability Gate (Hard)
Pass conditions:
1. Runtime manifest model/validator/loader exist and pass tests.
2. Canonical manifest migration path exists (generator + generated bundle).
3. Loader supports canonical-first with markdown fallback.

Evidence sources:
- `src/runtime/ProjectRuntimeManifest*.ts`
- `src/tools/generateRuntimeManifestBundle.ts`
- `docs/runtime/project-runtime-manifest.v1.json`

### 4. Performance/Operational Gate (Soft -> Hard at rollout)
Pass conditions:
1. No critical runtime regressions in standard smoke cycle.
2. Observability remains available for stage-level tracking.
3. Operator troubleshooting + rollback runbooks are published.

Evidence sources:
- `docs/process/ops/cockpit-operator-runbook.md`
- `docs/process/ops/white-label-onboarding-runbook.md`

### 5. Documentation Completeness Gate (Hard)
Pass conditions:
1. Migration guide published.
2. Compatibility report published.
3. White-label onboarding runbook published.
4. PM decision artifact (`go/no-go`) published.

Evidence sources:
- `docs/process/designs/TRADE-103-migration-guide.md`
- `docs/process/reviews/TRADE-103-compatibility-report.md`
- `docs/process/ops/white-label-onboarding-runbook.md`
- `docs/process/reviews/TRADE-105-decision-log.md`

## Final Rule
Milestone can be declared `GO` only when all Hard gates are `PASS` and no unresolved blocker remains in the extraction wave.
