import { RunContext } from './RunContext';
import { SystemPromptGenerator } from './SystemPromptGenerator';

export interface ExecutionPayload {
  runId: string;
  projectId: string;
  workspacePath: string;
  systemPrompt: string;
  userPrompt: string;
  task: {
    goal: string;
    type: string;
  };
  context: {
    role: string;
    pipeline: string;
    stage: string;
  };
  tools: Array<{
    name: string;
    description: string;
    schema?: any;
  }>;
  memory: {
    facts: Record<string, any>;
    decisions: Record<string, any>;
    threadHistory: Array<{
      role: 'user' | 'assistant' | 'observation';
      content: string;
      tool_call_id?: string;
    }>;
  };
  outputContract: any;
  guardrails: any;
}

export class ExecutionPayloadCompiler {
  /**
   * Compiles the canonical RunContext into a provider-agnostic structured payload.
   * This ensures all adapters receive identical, high-fidelity information.
   */
  static compile(context: RunContext): ExecutionPayload {
    const systemPrompt = SystemPromptGenerator.generate(context);
    
    return {
      runId: context.runId,
      projectId: context.projectId,
      workspacePath: context.workspacePath,
      systemPrompt,
      userPrompt: context.task.rawUserInput,
      task: {
        goal: context.task.normalizedGoal,
        type: context.task.taskType
      },
      context: {
        role: context.agent.slug,
        pipeline: context.pipeline.id,
        stage: context.pipeline.currentStageId
      },
      tools: context.tools.map(t => ({
        name: t.name,
        description: t.description,
        schema: t.schema
      })),
      memory: {
        facts: context.memory.sharedFacts,
        decisions: context.memory.runDecisions,
        threadHistory: context.memory.threadHistory
      },
      outputContract: context.outputContract,
      guardrails: context.guardrails
    };
  }
}
