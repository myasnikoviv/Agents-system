# TRADE-97 — Project Runtime Manifest Architecture v1

## Objective
Define a project-agnostic runtime architecture where orchestration is derived from project-provided agent/pipeline/skill files, not hardcoded flow logic.

## Scope
1. Canonical manifest schema.
2. Runtime contracts for loader/validator/resolver/executor/gates.
3. Compatibility adapter for existing markdown assets.
4. Rollout strategy and acceptance gates.

## 1) Canonical Manifest Model

### 1.1 Root Object: `ProjectRuntimeManifest`
```ts
interface ProjectRuntimeManifest {
  manifestVersion: '1.0';
  project: {
    id: string;
    name: string;
    rootPath: string;
  };
  agents: AgentSpec[];
  skills: SkillSpec[];
  pipelines: PipelineSpec[];
  policies: PolicySpec;
  metadata?: Record<string, string>;
}
```

### 1.2 Agents
```ts
interface AgentSpec {
  id: string;                // e.g. "pm-orchestrator"
  callsign: string;
  file: string;              // source file path in project
  capabilities: string[];    // plane/filesystem/terminal/playwright/etc.
  guardrails: string[];
  defaultSkills: string[];   // skill ids
}
```

### 1.3 Skills
```ts
interface SkillSpec {
  id: string;
  name: string;
  source: string;            // SKILL.md path
  triggerRules: {
    useWhen: string;
    avoidWhen: string;
    keywords: string[];
  }[];
}
```

### 1.4 Pipelines
```ts
interface PipelineSpec {
  id: string;                // new-feature / bug-fix / etc
  source: string;            // markdown source path
  stages: StageSpec[];
  transitions: TransitionSpec[];
  selectionRules: {
    keywords: string[];
    scoreWeight?: number;
  }[];
  default?: boolean;        // one pipeline should be default=true
}

interface StageSpec {
  id: string;                // intake/research/qa/etc
  role: string;              // agent id
  requiredGates: string[];   // policy gate ids
  outputs: string[];         // required artifacts
}

interface TransitionSpec {
  from: string;
  to: string;
  condition?: string;        // optional DSL or expression id
}
```

### 1.5 Policies / Gates
```ts
interface PolicySpec {
  gates: GateSpec[];
}

interface GateSpec {
  id: string;                // git-preflight / postflight-validation / etc
  type: 'pre-stage' | 'post-stage' | 'pre-pipeline-close';
  rule: string;              // expression ref / evaluator id
  severity: 'hard' | 'soft';
  failureStatus: 'blocked' | 'rework';
}
```

## 2) Runtime Contracts

### 2.1 `ManifestLoader`
- Input: project root path.
- Output: normalized `ProjectRuntimeManifest`.
- Responsibilities:
  - parse project agent/pipeline/skill files
  - map to canonical schema
  - include source path traceability

### 2.2 `ManifestValidator`
- Structural validation: schema, required fields, id uniqueness.
- Semantic validation:
  - every pipeline stage role exists in agents
  - every required gate exists
  - transitions form executable DAG/graph with at least one terminal stage
  - exactly one default pipeline

### 2.3 `PipelineResolver`
- Input: user message + manifest selection rules.
- Output: `{pipelineId, confidence, reason}`.
- Behavior:
  - compute weighted score from project rules
  - default to pipeline flagged `default=true`
  - no hardcoded platform keyword tables

### 2.4 `DynamicGraphBuilder`
- Input: selected `PipelineSpec`.
- Output: executable graph object (LangGraph or internal adapter).
- Behavior:
  - create nodes from `StageSpec`
  - create edges from `TransitionSpec`
  - inject pre/post gate evaluators by stage

### 2.5 `GateEngine`
- Evaluates policy gates declaratively.
- On hard-fail returns deterministic payload:
```json
{
  "status":"blocked",
  "gate":"git-preflight",
  "reason":"missing_preflight_token",
  "requiredAction":"handoff:git-flow-manager"
}
```

## 3) Compatibility Adapter (v0 -> v1)

### 3.1 Adapter Goal
Allow existing `docs/agents/*.md`, `docs/skills/*.md`, `docs/pipelines/*.md` to power v1 runtime without immediate format rewrite.

### 3.2 Adapter Rules
1. Parse known section headers (`Mission`, `Owns`, `Guardrails`, `Steps`, `Exit Criteria`, etc).
2. Infer stage order from numbered pipeline `Steps`.
3. Resolve role by stage label mapping table (project-local, overridable).
4. Preserve unresolved mappings as validation warnings (hard fail if role cannot be resolved).

## 4) Execution Lifecycle
1. Load manifest from project root.
2. Validate manifest (block on hard failures).
3. Resolve pipeline from message using manifest rules.
4. Build dynamic graph for selected pipeline.
5. Execute stage-by-stage with gate enforcement.
6. Persist stage state to pipeline-state artifact.
7. Close pipeline only if pre-pipeline-close gates pass (e.g. postflight evidence).

## 5) Non-Functional Requirements
1. Graph build latency target: <= 150ms for typical project manifests.
2. Manifest cache by hash to avoid rebuild overhead.
3. Deterministic error taxonomy for UI and automation.
4. Full traceability: each runtime decision references source file/section.

## 6) Rollout Plan
1. **Phase 1**: implement loader+validator (shadow mode).
2. **Phase 2**: implement resolver+dynamic graph builder behind feature flag.
3. **Phase 3**: dual-run comparison (fixed flow vs manifest flow).
4. **Phase 4**: cutover default to manifest runtime.
5. **Phase 5**: white-label onboarding for additional project bundles.

## 7) Acceptance Gates for Architecture Completion
1. Canonical schema defined and reviewable.
2. Runtime contract interfaces stable for implementation tickets.
3. Compatibility strategy documented for current project.
4. Clear rollout plan with risk controls and success criteria.

## Handoff Targets
- TRADE-98: implement loader/validator
- TRADE-99: implement dynamic graph executor
- TRADE-100: implement manifest-based pipeline resolver
- TRADE-101/102: QA contracts + E2E smoke matrix
