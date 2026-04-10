# TRADE-96 — Manifest-Driven Runtime Fit-Gap Analysis

## Context
Current cockpit runtime is not project-agnostic. It executes a fixed orchestration flow and only partially consumes project agent/skill files.

## Current State (Observed)
1. LangGraph Studio entrypoint is fixed to one graph via `langgraph.json`:
   - `./src/runtime/graphs/PilotQuasiLinearGraph.ts:pilotGraph`
2. Stage graph is hardcoded in code (fixed nodes/edges):
   - Intake -> Research -> Trader -> Architecture -> QA -> Developer -> Runner -> Reviewer -> Domain -> Git -> Docs
3. Pipeline selection is hardcoded keyword routing in `src/runtime/PipelineSelector.ts`.
4. Agent files are loaded for prompt context (mission/guardrails), but do not define executable stage transitions.
5. Skill routing is partly configurable but based on static `SkillCatalog.ts` mapping in runtime.

## Gap Summary
1. **Flow-as-code coupling**: orchestration lives in TS graph, not in project pipeline definitions.
2. **Pipeline selection coupling**: keyword rules are platform-coded, not project-configured.
3. **Role/tool policy coupling**: allowed tools and guard behavior are static maps in runtime.
4. **Single-project assumptions**: directory conventions and runtime behavior assume one repo shape.
5. **Partial config loading**: docs are treated as advisory text, not authoritative execution spec.

## Target State
A project-agnostic orchestration engine where runtime behavior is derived from project bundle files.

### Target Principles
1. **Manifest as source of truth** for agents/pipelines/skills/guards.
2. **Dynamic executor** builds stage graph from selected pipeline definition.
3. **Declarative policies** (git preflight, postflight QA, approvals) are stage gates in manifest.
4. **Project adapter layer** maps project folder structure into canonical manifest model.
5. **Strict validation**: runtime refuses to execute invalid/incomplete manifests.

## Proposed Runtime Abstractions
1. `ProjectRuntimeManifest`
   - `agents[]`: role id, file path, capabilities, guard requirements
   - `skills[]`: skill id, source path, trigger rules
   - `pipelines[]`: stages, transitions, required roles, gate policies
   - `policies`: git/postflight/approval/global constraints
2. `ManifestLoader`
   - reads project files and normalizes into canonical model
3. `ManifestValidator`
   - schema + semantic checks (missing roles, broken transitions, unresolved gates)
4. `PipelineResolver`
   - selects pipeline using manifest rules + confidence + default
5. `DynamicGraphBuilder`
   - compiles selected pipeline to runtime execution graph
6. `GateEngine`
   - evaluates declarative gate rules before/after stages

## Compatibility with Existing Project Files
1. Existing `docs/agents/*.md`, `docs/skills/*.md`, `docs/pipelines/*.md` can be retained.
2. A migration adapter can parse current markdown sections into canonical fields.
3. Backward compatibility mode can route to existing fixed graph until manifest coverage is complete.

## Risks and Mitigation
1. **Risk**: parsing markdown inconsistencies.
   - Mitigation: strict linter + schema validator + required section templates.
2. **Risk**: behavior drift during migration.
   - Mitigation: snapshot baseline runs and replay matrix before switch.
3. **Risk**: performance overhead for dynamic graph creation.
   - Mitigation: compile-and-cache graph per project manifest hash.
4. **Risk**: gate deadlocks.
   - Mitigation: deterministic gate diagnostics and unblock instructions in API response.

## Recommended Delivery Phases
1. Phase A: Canonical schema + loader + validator (no runtime switch).
2. Phase B: Dynamic pipeline resolver + graph builder behind feature flag.
3. Phase C: Dual-run mode (fixed graph vs manifest graph) and diff reporting.
4. Phase D: Default switch to manifest runtime.
5. Phase E: White-label onboarding flow and non-trade project proof.

## Acceptance Criteria for Research Completion
1. Root cause and gap map documented.
2. Target architecture abstractions defined.
3. Migration sequence and risk controls specified.
4. Inputs for architecture ticket TRADE-97 prepared.

## Handoff to Architecture (TRADE-97)
Architecture must formalize:
1. canonical manifest schema v1
2. stage/gate contract
3. dynamic graph builder contract
4. compatibility adapter contract for existing markdown assets
