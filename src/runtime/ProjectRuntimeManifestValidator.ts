import {
  ManifestValidationIssue,
  ProjectRuntimeManifest,
} from './ProjectRuntimeManifest';

function ensureUnique(items: string[], entity: string, issues: ManifestValidationIssue[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) {
      issues.push({
        code: 'duplicate_id',
        message: `Duplicate ${entity} id: ${item}`,
        severity: 'error',
      });
    }
    seen.add(item);
  }
}

export function validateProjectRuntimeManifest(manifest: ProjectRuntimeManifest): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];

  if (manifest.manifestVersion !== '1.0') {
    issues.push({
      code: 'unsupported_manifest_version',
      message: `Unsupported manifestVersion: ${manifest.manifestVersion}`,
      severity: 'error',
    });
  }

  ensureUnique(manifest.agents.map((a) => a.id), 'agent', issues);
  ensureUnique(manifest.skills.map((s) => s.id), 'skill', issues);
  ensureUnique(manifest.pipelines.map((p) => p.id), 'pipeline', issues);
  ensureUnique(manifest.policies.gates.map((g) => g.id), 'gate', issues);

  const agentIds = new Set(manifest.agents.map((a) => a.id));
  const gateIds = new Set(manifest.policies.gates.map((g) => g.id));

  let fallbackCount = 0;
  for (const pipeline of manifest.pipelines) {
    if (pipeline.fallback) {
      fallbackCount += 1;
    }

    if (pipeline.stages.length === 0) {
      issues.push({
        code: 'pipeline_without_stages',
        message: `Pipeline ${pipeline.id} has no stages`,
        path: `pipelines.${pipeline.id}`,
        severity: 'error',
      });
      continue;
    }

    const stageIds = new Set(pipeline.stages.map((s) => s.id));
    ensureUnique(pipeline.stages.map((s) => s.id), `stage in ${pipeline.id}`, issues);

    for (const stage of pipeline.stages) {
      if (!agentIds.has(stage.role)) {
        issues.push({
          code: 'unknown_stage_role',
          message: `Pipeline ${pipeline.id} stage ${stage.id} references unknown role ${stage.role}`,
          path: `pipelines.${pipeline.id}.stages.${stage.id}.role`,
          severity: 'error',
        });
      }

      for (const gate of stage.requiredGates) {
        if (!gateIds.has(gate)) {
          issues.push({
            code: 'unknown_required_gate',
            message: `Pipeline ${pipeline.id} stage ${stage.id} requires unknown gate ${gate}`,
            path: `pipelines.${pipeline.id}.stages.${stage.id}.requiredGates`,
            severity: 'error',
          });
        }
      }
    }

    for (const tr of pipeline.transitions) {
      if (!stageIds.has(tr.from)) {
        issues.push({
          code: 'transition_unknown_from',
          message: `Pipeline ${pipeline.id} transition has unknown from stage ${tr.from}`,
          path: `pipelines.${pipeline.id}.transitions`,
          severity: 'error',
        });
      }
      if (!stageIds.has(tr.to)) {
        issues.push({
          code: 'transition_unknown_to',
          message: `Pipeline ${pipeline.id} transition has unknown to stage ${tr.to}`,
          path: `pipelines.${pipeline.id}.transitions`,
          severity: 'error',
        });
      }
    }
  }

  if (fallbackCount !== 1) {
    issues.push({
      code: 'invalid_fallback_count',
      message: `Expected exactly one fallback pipeline, got ${fallbackCount}`,
      path: 'pipelines',
      severity: 'error',
    });
  }

  if (manifest.agents.length === 0) {
    issues.push({
      code: 'missing_agents',
      message: 'Manifest has no agents',
      severity: 'error',
    });
  }

  if (manifest.pipelines.length === 0) {
    issues.push({
      code: 'missing_pipelines',
      message: 'Manifest has no pipelines',
      severity: 'error',
    });
  }

  return issues;
}
