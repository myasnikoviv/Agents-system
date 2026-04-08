# Pre-Sprint 24 Gate Report — Policy & Loop Management Audit

Generated: 2026-04-08  
Branch: `codex/s19-runtime-remediation`

## Decision Summary

- Policy System State: **PARTIALLY MANAGED**
- Ready for Sprint 24: **YES, with mandatory scope/lifecycle/UI closures below**

Rationale:
- Rules are declarative and loaded from registry (`docs/runtime/governance/rule-registry.yaml`, `src/runtime/governance/RuleRegistry.ts`).
- Project-level enabling/disabling exists (`docs/runtime/governance/project-policy.json`, `src/runtime/governance/ProjectPolicyBinding.ts`).
- Manual overrides exist by API (`/api/cockpit/governance/overrides`) and are project-scoped (`src/runtime/governance/ManualOverrideRegistry.ts`).
- But rule creation/update lifecycle is still config/code-driven, not fully productized through Cockpit UI/API catalog management.

## Section 1 — Rule Catalog (System Level)

### 1.1 Rule Registry
- Storage: **YAML + code types**.
- Primary catalog: `docs/runtime/governance/rule-registry.yaml`.
- Loader: `loadGovernanceRules` in `src/runtime/governance/RuleRegistry.ts`.
- Typed contract (IDs/checks/phases): `src/runtime/governance/GovernanceEngineTypes.ts`.

### 1.2 Rule Structure
Each rule in registry has:
- `id`
- `triggerPhases`
- `evidence`
- `evaluationType`
- `deterministicCheck` (for deterministic rules)
- `enforcementMode`
- `enabledByDefault`

Gap:
- Human-friendly `name` and `description` are not part of the current schema.

### 1.3 Rule Discoverability
- Full rule list via dedicated API endpoint: **NO** (currently missing).
- Cockpit can show overrides, not full registry catalog from backend.

Output:
- total rules: **8**
- storage: **YAML + code-typed schema**
- accessible via API: **partially** (overrides yes, full catalog no)

## Section 2 — Evaluator Capabilities

### 2.1 Evaluator Types
Built-in deterministic evaluators (`src/runtime/governance/DeterministicEvaluationEngine.ts`):
- `preflight_token`
- `ticket_context_present`
- `postflight_report`
- `improvement_artifact`
- `agent_usage_events`
- `pipeline_usage_events`
- `cost_guard_tokens`
- `loop_pressure_hard`

### 2.2 Extensibility
- Add new evaluator without code: **NO**.
- Add via config only: **NO**.
- Requires code change in deterministic handler map (or enabling hybrid/LLM fallback policy).

### 2.3 Binding
- Binding model: **static** via `deterministicCheck` -> handler map.

Output:
- built-in: `[preflight_token, ticket_context_present, postflight_report, improvement_artifact, agent_usage_events, pipeline_usage_events, cost_guard_tokens, loop_pressure_hard]`
- extensible: **code-only**
- binding model: **static**

## Section 3 — Rule Scoping (Critical)

### 3.1 Scope Levels
- global rules (defaults): **YES** (`defaultEnabledRules`)
- project rules: **YES** (`projects[projectId]`)
- task/session rules: **PARTIAL** (manual overrides can be ticket-scoped via `ticketId`, but not full first-class task policy object)

### 3.2 Project Isolation
- Same rule enabled in one project and disabled in another: **YES**.

### 3.3 Inheritance Model
- system defaults + project overrides: **YES**.

### 3.4 Rule Overrides
- override enabled/disabled per project: **YES**.
- override evidence/thresholds per project via structured policy: **PARTIAL**.
- temporary runtime override: **YES** (`ManualOverrideRegistry`, scopes `global|phase|rule`).

Output:
- global: **yes**
- project-level: **yes**
- overrides: **yes (enable/disable + manual override records)**
- inheritance: **yes**

## Section 4 — Rule Lifecycle Management

### 4.1 Create Rule
- UI: **NO**
- API: **NO** (for rule definitions)
- Code/config: **YES** (edit YAML + types)

### 4.2 Update Rule
- evidence/trigger/thresholds via UI: **NO**
- via dedicated rule API: **NO**
- via config/code: **YES**

### 4.3 Delete / Disable
- disable rule per project: **YES** (`project-policy.json`)
- delete rule definition from product UI/API: **NO**

Critical check:
- Disable system rule for specific project: **YES** (by `disabledRules` and project enabled set).

Output:
- create: **code/config**
- update: **code/config**
- disable: **yes (project policy + manual override path)**

## Section 5 — Loop Execution Model

### 5.1 Loop Triggering
- event/stage-driven: **YES** (governance phases `BEFORE_RUN`, `AFTER_STEP`, `AFTER_RUN`)
- manual trigger: **YES** (`POST /api/cockpit/governance/loops/force`)

### 5.2 Evidence Collection
Evidence sources include:
- artifacts (preflight/test/improvement files)
- runtime events (`agent.started`, `stage.started`)
- telemetry (`docs/process/runs/cost/*.json`)

### 5.3 Determinism
- Deterministic by default: **YES** (`execution-policy.json` => `strictDeterministic=true`, `llmFallbackEnabled=false`)
- Can loop run without LLM: **YES**

Output:
- trigger: **phase-based + manual forced loop endpoint**
- evidence: **artifacts + events + telemetry**
- deterministic: **yes**

## Section 6 — UI / Cockpit Integration

### 6.1 Rule Visibility
- rule list in UI: **NO (not full registry list)**
- status enabled/disabled per project in UI: **PARTIAL** (through policy behavior, no complete rule catalog panel)

### 6.2 Editing Capability
- edit rule definition from UI: **NO**
- create manual override from API: **YES**

### 6.3 Scope UI
- visible active rules per project: **NO direct complete view**

Critical check:
- disable `git_preflight` for one project: **technically yes via project policy config; not fully UI-managed**

Output:
- rule list: **no**
- editing: **partial (overrides only, not definitions)**
- project config: **partial**

## Section 7 — Real Use Case Validation

Scenario 1 — Marketing Project (NO GIT)
- Current status: **Supported by policy config**, but requires config management path (not yet guided Cockpit UI flow).

Scenario 2 — Add Custom Loop
- Current status: **Requires code/config change** (new deterministic handler + rule schema wiring if new check).

Scenario 3 — Override Rule Threshold
- Current status: **Partial**.
- Global env thresholds exist (e.g., `GOVERNANCE_COST_GUARD_MAX_TOKENS`), but no complete per-project threshold editor in Cockpit.

## Section 8 — Gaps & Risks

Gaps:
- No first-class Rule Catalog API (read/write) for Cockpit.
- No UI for lifecycle management (create/update/delete rule definitions).
- Evaluator extensibility is code-bound.
- Rule schema lacks business metadata (`name`, `description`, owner, version).
- Task/session-level policy is only partial through manual overrides, not full policy object model.

Risks:
- Governance remains "config + code" heavy; operational teams depend on engineering for rule evolution.
- Scope mistakes in config can silently change enforcement behavior across projects.
- Without catalog API/UI, traceability/audit UX in Cockpit remains incomplete.

## Pre-Sprint 24 Decision

Policy System State:
- **PARTIALLY MANAGED**

Critical Missing Pieces:
- Rule Catalog API (list/get/create/update/disable) with audit trail.
- Project-scoped policy editor in Cockpit.
- Evaluator plugin contract for no-code/low-code extension.
- Full scope model: global -> project -> session/task with explicit precedence.
- Rule metadata and versioning model.

Ready for Sprint 24:
- **YES**, if Sprint 24 targets productization of policy lifecycle/scoping/UI and not just additional YAML rules.
