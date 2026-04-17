import { PipelineRegistry } from '../registries/PipelineRegistry';
import { CompliancePlan } from './ComplianceTypes';

const DEFAULT_STAGES: Record<string, string[]> = {
  'bug-fix': ['intake', 'analysis', 'implementation', 'verification'],
  'new-feature': ['intake', 'architecture', 'implementation', 'review', 'verification'],
  'refactor': ['intake', 'analysis', 'implementation', 'verification'],
};

export function buildExecutionPlan(base: CompliancePlan): CompliancePlan {
  const pipeline = PipelineRegistry.getPipeline(base.pipeline);
  const stages = pipeline
    ? pipeline.stages.map((s) => s.id)
    : (DEFAULT_STAGES[base.pipeline] || ['intake', 'implementation', 'verification']);

  return {
    ...base,
    stages: Array.from(new Set(stages.filter(Boolean))),
  };
}
