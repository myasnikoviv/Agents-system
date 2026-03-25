import { AgentProfile, PipelineDefinition, PipelineStage } from '../DynamicDiscoveryService';
import { ToolDiscoveryService } from '../ToolDiscoveryService';
import { BlackboardService } from '../BlackboardService';

export type ResponseMode = 'handoff' | 'final' | 'clarify' | 'tool_call';

export interface StructuredArtifact {
  runId: string;
  stageId: string;
  roleSlug: string;
  timestamp: string;

  summary: string;
  findings?: string[];
  decisions?: string[];
  risks?: string[];
  blockers?: string[];
  producedFiles?: string[];
  toolCalls?: Array<{
    tool: string;
    status: 'success' | 'failed';
    summary: string;
  }>;

  handoff?: {
    nextRole: string;
    rationale: string;
  };
}

export interface RunContext {
  runId: string;
  threadId: string;
  projectId: string;
  workspacePath: string;

  executionTarget: 'codex-cli' | 'claude-cli' | 'openhands' | 'langchain';
  provider: string;
  model: string;
  sandboxMode?: string;

  task: {
    rawUserInput: string;
    normalizedGoal: string;
    taskType: string;
    acceptanceCriteria?: string[];
  };

  pipeline: {
    id: string;
    title: string;
    currentStageId: string;
    currentStageTitle: string;
    stepIndex: number;
    allowedNextStages: string[];
  };

  agent: {
    slug: string;
    title: string;
    mission: string;
    instructions: string;
    skills: string[]; // Added for telemetry
    handoffPolicy?: string;
  };

  artifacts: {
    priorOutputs: StructuredArtifact[];
  };

  memory: {
    threadHistory: Array<{
      role: 'user' | 'assistant' | 'observation';
      content: string;
      tool_call_id?: string;
      tool_calls?: any[];
      tool_name?: string;
      rawParts?: any[];
    }>;
    sharedFacts: Record<string, unknown>;
    runDecisions: Record<string, unknown>;
    handoffContext?: {
      fromRole: string;
      toRole: string;
      summary: string;
      rationale: string;
    };
  };

  tools: Array<{
    name: string;
    description: string;
    schema?: object;
    source: 'static' | 'dynamic' | 'mcp';
  }>;

  outputContract: {
    responseMode: ResponseMode;
    requiredSections: string[];
    mustWriteArtifactLog: boolean;
    mustEmitEvent: boolean;
  };

  guardrails: {
    allowedActions: string[];
    blockedActions: string[];
    requireApprovalFor?: string[];
  };

  activeTicketId?: string; // Added for tracking
  startTime: string;
}

export class RunContextAssembler {
  static async assemble(
    agent: AgentProfile,
    pipeline: PipelineDefinition,
    stageId: string,
    taskDescription: string,
    memory: any = {},
    projectContext?: { projectId: string, workspacePath: string }
  ): Promise<RunContext> {
    const stageIndex = pipeline.stages.findIndex(s => s.id === stageId);
    const stage = pipeline.stages[stageIndex];
    if (!stage) {
      throw new Error(`Stage ${stageId} not found in pipeline ${pipeline.slug}`);
    }

    const ctx: RunContext = {
      runId: memory.runId || `run_${Date.now()}`,
      threadId: memory.threadId || 'default-thread',
      projectId: projectContext?.projectId || process.env.ACTIVE_PROJECT_ID || 'default',
      workspacePath: projectContext?.workspacePath || process.cwd(),

      executionTarget: 'langchain', // Default, AgentExecutor will override
      provider: 'openai',
      model: 'gpt-4o',

      task: {
        rawUserInput: taskDescription,
        normalizedGoal: taskDescription, // TODO: LLM normalization
        taskType: pipeline.slug,
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
        handoffPolicy: 'standard'
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
        requiredSections: ['summary', 'findings'],
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

    await BlackboardService.hydrate(ctx);
    return ctx;
  }
}
