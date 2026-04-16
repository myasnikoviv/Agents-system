import { selectPipelineForProject } from '../PipelineSelector';
import { PipelineRegistry } from '../registries/PipelineRegistry';

export async function resolveAdaptivePipelineRoute(input: {
  enforcedPipeline?: string;
  selectedPipeline?: string;
  plannerPipeline?: string;
  message: string;
  workspacePath: string;
}): Promise<{ pipeline: string; reason: string }> {
  const enforced = String(input.enforcedPipeline || '').trim();
  const selected = String(input.selectedPipeline || '').trim();
  const planned = String(input.plannerPipeline || '').trim();
  const primary = enforced || selected || planned || 'unified-task-intake';
  if (PipelineRegistry.getPipeline(primary)) {
    return { pipeline: primary, reason: 'primary_pipeline_available' };
  }
  const adaptive = await selectPipelineForProject(input.message, input.workspacePath);
  return {
    pipeline: adaptive.selectedPipeline || 'unified-task-intake',
    reason: `adaptive_default:${adaptive.reason}`,
  };
}
