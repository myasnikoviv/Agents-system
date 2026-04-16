import {
  ManifestGateSpec,
  ManifestStageSpec,
  ManifestTransitionSpec,
  ProjectRuntimeManifest,
} from './ProjectRuntimeManifest';

export interface DynamicExecutionContext {
  ticketId: string;
  threadId: string;
  input: string;
}

export interface StageExecutionResult {
  status: 'success' | 'blocked' | 'failed';
  log?: string;
  outputs?: Record<string, unknown>;
  reason?: string;
}

export interface GateEvaluationResult {
  ok: boolean;
  reason?: string;
}

export interface DynamicPipelineHandlers {
  runStage: (stage: ManifestStageSpec, context: DynamicExecutionContext) => Promise<StageExecutionResult>;
  evaluateGate: (gate: ManifestGateSpec, stage: ManifestStageSpec | null, context: DynamicExecutionContext) => Promise<GateEvaluationResult>;
}

export interface DynamicPipelineExecutionResult {
  pipelineId: string;
  status: 'completed' | 'blocked' | 'failed';
  stageLogs: string[];
  completedStages: string[];
  blockedByGate?: string;
  blockedStage?: string;
  reason?: string;
}

function resolvePipelineOrThrow(manifest: ProjectRuntimeManifest, pipelineId: string) {
  const pipeline = manifest.pipelines.find((p) => p.id === pipelineId);
  if (!pipeline) {
    throw new Error(`pipeline_not_found:${pipelineId}`);
  }
  return pipeline;
}

function resolveLinearStageOrder(stages: ManifestStageSpec[], transitions: ManifestTransitionSpec[]): ManifestStageSpec[] {
  if (stages.length <= 1 || transitions.length === 0) {
    return stages;
  }

  const byId = new Map(stages.map((s) => [s.id, s] as const));
  const inbound = new Map<string, number>();
  const nextByFrom = new Map<string, string>();

  for (const s of stages) {
    inbound.set(s.id, 0);
  }

  for (const t of transitions) {
    inbound.set(t.to, (inbound.get(t.to) || 0) + 1);
    if (!nextByFrom.has(t.from)) {
      nextByFrom.set(t.from, t.to);
    }
  }

  const start = stages.find((s) => (inbound.get(s.id) || 0) === 0) || stages[0];
  if (!start) return stages;

  const ordered: ManifestStageSpec[] = [];
  const visited = new Set<string>();
  let current: string | undefined = start.id;

  while (current && !visited.has(current)) {
    const stage = byId.get(current);
    if (!stage) break;
    ordered.push(stage);
    visited.add(current);
    current = nextByFrom.get(current);
  }

  for (const stage of stages) {
    if (!visited.has(stage.id)) {
      ordered.push(stage);
    }
  }

  return ordered;
}

export async function executeDynamicPipeline(
  manifest: ProjectRuntimeManifest,
  pipelineId: string,
  context: DynamicExecutionContext,
  handlers: DynamicPipelineHandlers,
): Promise<DynamicPipelineExecutionResult> {
  const pipeline = resolvePipelineOrThrow(manifest, pipelineId);
  const stageOrder = resolveLinearStageOrder(pipeline.stages, pipeline.transitions);
  const gatesById = new Map(manifest.policies.gates.map((g) => [g.id, g] as const));

  const stageLogs: string[] = [];
  const completedStages: string[] = [];

  for (const stage of stageOrder) {
    for (const gateId of stage.requiredGates) {
      const gate = gatesById.get(gateId);
      if (!gate) {
        return {
          pipelineId,
          status: 'failed',
          stageLogs,
          completedStages,
          reason: `missing_gate_definition:${gateId}`,
        };
      }

      const gateResult = await handlers.evaluateGate(gate, stage, context);
      if (!gateResult.ok && gate.severity === 'hard') {
        return {
          pipelineId,
          status: 'blocked',
          stageLogs,
          completedStages,
          blockedByGate: gate.id,
          blockedStage: stage.id,
          reason: gateResult.reason || 'gate_blocked',
        };
      }
    }

    const result = await handlers.runStage(stage, context);
    if (result.log) {
      stageLogs.push(result.log);
    }

    if (result.status === 'success') {
      completedStages.push(stage.id);
      continue;
    }

    if (result.status === 'blocked') {
      return {
        pipelineId,
        status: 'blocked',
        stageLogs,
        completedStages,
        blockedStage: stage.id,
        reason: result.reason || 'stage_blocked',
      };
    }

    return {
      pipelineId,
      status: 'failed',
      stageLogs,
      completedStages,
      blockedStage: stage.id,
      reason: result.reason || 'stage_failed',
    };
  }

  const closeGates = manifest.policies.gates.filter((g) => g.type === 'pre-pipeline-close');
  for (const gate of closeGates) {
    const gateResult = await handlers.evaluateGate(gate, null, context);
    if (!gateResult.ok && gate.severity === 'hard') {
      return {
        pipelineId,
        status: 'blocked',
        stageLogs,
        completedStages,
        blockedByGate: gate.id,
        reason: gateResult.reason || 'close_gate_blocked',
      };
    }
  }

  return {
    pipelineId,
    status: 'completed',
    stageLogs,
    completedStages,
  };
}
