import { AgentRegistry, PipelineRegistry, AgentProfile, PipelineDefinition } from '../DynamicDiscoveryService';
import { RunContextAssembler, RunContext } from './RunContext';
import { MemoryHydrator } from './MemoryHydrator';

export class RoleActivator {
  /**
   * Activates a role based on the requested agent slug and pipeline/stage context.
   */
  static async activate(
    agentSlug: string,
    pipelineSlug?: string,
    stageId?: string,
    identifier?: string // runId or ticketId
  ): Promise<RunContext> {
    const agent = AgentRegistry.getAgent(agentSlug);
    if (!agent) {
      throw new Error(`Agent not found: ${agentSlug}`);
    }

    // Default to 'unified-task-intake' if no pipeline is provided
    const effectivePipelineSlug = pipelineSlug || 'unified-task-intake';
    const pipeline = PipelineRegistry.getPipeline(effectivePipelineSlug);
    
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${effectivePipelineSlug}`);
    }

    // If stageId is not provided, try to find it from identifier/memory or use the first stage
    let effectiveStageId = stageId;
    let memory: any = {};

    if (identifier) {
      const hydrated = await MemoryHydrator.hydrate(identifier);
      memory = hydrated;
      // If we are in the middle of a run, the stageId should be in memory (handled by swarm logic)
    }

    if (!effectiveStageId) {
      effectiveStageId = pipeline.stages[0]?.id || '1';
    }

    const runContext = RunContextAssembler.assemble(
      agent,
      pipeline,
      effectiveStageId,
      'Execute task via RoleActivator',
      memory
    );

    return runContext;
  }
}
