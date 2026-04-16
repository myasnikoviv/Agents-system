import { 
  RunContext, 
  StructuredArtifact, 
  ResponseMode, 
  TaskPackage, 
  DetectedLanguage 
} from '@system/shared';

export { 
  RunContext, 
  StructuredArtifact, 
  ResponseMode, 
  TaskPackage, 
  DetectedLanguage 
};
import { AgentProfile, PipelineDefinition, PipelineStage } from '../DynamicDiscoveryService';
import { ToolDiscoveryService } from '../ToolDiscoveryService';
import { BlackboardService } from '../BlackboardService';
import { assertWorkerProjectIsolation, buildAgentIdentity } from '../identity/AgentIdentity';
import { resolveTenantScope, validateTenantBoundary } from '../tenancy/TenantContext';
import { injectRelevantMemoryIntoContext } from '@system/memory';

export class RunContextAssembler {
  static async assemble(
    agent: AgentProfile,
    pipeline: PipelineDefinition,
    stageId: string,
    taskDescription: string,
    memory: any = {},
    runtimeHints?: { preferredLanguage?: DetectedLanguage },
    projectContext?: { projectId: string, workspacePath: string }
  ): Promise<RunContext> {
    if (!agent) {
      throw new Error('RunContextAssembler: agent is required.');
    }
    if (!pipeline) {
      throw new Error('RunContextAssembler: pipeline is required.');
    }
    if (!Array.isArray(pipeline.stages) || pipeline.stages.length === 0) {
      throw new Error(`RunContextAssembler: pipeline ${pipeline.slug || pipeline.id || 'unknown'} has no stages.`);
    }
    const effectiveStageId = String(stageId || '').trim() || pipeline.stages[0].id;
    const stageIndex = pipeline.stages.findIndex(s => s.id === effectiveStageId);
    const stage = pipeline.stages[stageIndex];
    if (!stage) {
      throw new Error(`Stage ${effectiveStageId} not found in pipeline ${pipeline.slug}`);
    }

    const resolvedProjectId = projectContext?.projectId || process.env.ACTIVE_PROJECT_ID || 'default';
    const tenancy = resolveTenantScope({
      tenantId: memory.tenantId,
      workspaceId: memory.workspaceId,
      projectId: resolvedProjectId,
      environmentId: memory.environmentId,
      runId: memory.runId,
      agentSlug: agent.slug,
    });
    const boundary = validateTenantBoundary(tenancy);
    if (!boundary.ok) {
      const reason = 'reason' in boundary ? boundary.reason : 'invalid_tenant_boundary';
      throw new Error(`RunContextAssembler tenancy boundary failed: ${reason}`);
    }

    const agentIdentity = buildAgentIdentity({
      projectId: tenancy.projectId,
      agentSlug: agent.slug,
      workerId: memory.workerId,
      tenantId: tenancy.tenantId,
      workspaceId: tenancy.workspaceId,
      environmentId: tenancy.environmentId,
    });
    const isolation = assertWorkerProjectIsolation(agentIdentity);
    if (!isolation.ok) {
      throw new Error(`RunContextAssembler identity isolation failed: ${isolation.reason}`);
    }

    const ctx: RunContext = {
      runId: memory.runId || `run_${Date.now()}`,
      threadId: memory.threadId || 'default-thread',
      chainId: memory.threadId || 'default-thread',
      projectId: agentIdentity.projectId,
      workspacePath: projectContext?.workspacePath || process.cwd(),
      
      workPackage: memory.workPackage, // Hydrated from memory/blackboard

      executionTarget: 'langchain', // Default, AgentExecutor will override
      provider: 'openai',
      model: 'gpt-4o',

      task: {
        rawUserInput: taskDescription,
        normalizedGoal: taskDescription, // TODO: LLM normalization
        taskType: pipeline.slug,
        responseLanguage: runtimeHints?.preferredLanguage || 'unknown',
        acceptanceCriteria: []
      },

      pipeline: {
        id: pipeline.slug,
        title: pipeline.title,
        currentStageId: stage.id,
        currentStageTitle: stage.title || stage.id,
        stepIndex: stageIndex,
        allowedNextStages: pipeline.stages.slice(stageIndex + 1).map(s => s.id)
      },

      agent: {
        slug: agent.slug,
        title: agent.title || agent.slug,
        mission: agent.mission || 'Execute assigned task strictly.',
        instructions: agent.instructions || '',
        skills: agent.skills || [],
        handoffPolicy: 'standard',
        workerId: agentIdentity.workerId,
        identityKey: agentIdentity.identityKey,
        memoryNamespace: agentIdentity.memoryNamespace,
      },

      artifacts: {
        priorOutputs: [] // Will be hydrated by BlackboardService
      },
      
      memory: {
        threadHistory: memory.history || [],
        sharedFacts: {}, // Will be hydrated by BlackboardService
        runDecisions: {}, // Will be hydrated by BlackboardService
        handoffContext: undefined // Will be hydrated by BlackboardService
      },

      tools: (await ToolDiscoveryService.resolveTools({
        agent,
        pipeline: { id: pipeline.slug, currentStageId: stage.id },
        guardrails: { blockedActions: agent.guardrails || [] }
      })).map(t => ({
        name: t.name,
        description: t.description,
        source: 'dynamic'
      })),

      outputContract: {
        responseMode: 'final',
        requiredSections: [],
        mustWriteArtifactLog: true,
        mustEmitEvent: true
      },

      guardrails: {
        allowedActions: ['read', 'write', 'search'],
        blockedActions: ['rm -rf', 'delete_database']
      },

      activeTicketId: memory.activeTicketId,
      startTime: new Date().toISOString()
    };

    ctx.tenantId = tenancy.tenantId;
    ctx.workspaceId = tenancy.workspaceId;
    ctx.environmentId = tenancy.environmentId;

    await BlackboardService.hydrate(ctx);
    try {
      await injectRelevantMemoryIntoContext(ctx, ctx.task.rawUserInput || ctx.task.normalizedGoal || '');
    } catch (error) {
      // Memory-aware enrichment is best-effort and must not block execution.
      console.warn('[RunContextAssembler] memory-aware injection failed:', (error as any)?.message || error);
    }
    return ctx;
  }
}
