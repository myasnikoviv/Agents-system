import * as path from 'path';
import { StateGraph, START, END, MemorySaver, Annotation } from '@langchain/langgraph';
import { resolveExplicitDirectives } from '../IntakeClassifier';
import { DynamicDiscoveryService } from '../DynamicDiscoveryService';
import { AgentRegistry } from '../registries/AgentRegistry';
import { PipelineRegistry } from '../registries/PipelineRegistry';
import { emitEvent, emitSwarmEvent } from '../events/EventBus';
import { RunContextAssembler } from '../context/RunContext';
import { AgentExecutor } from '../AgentExecutor';
import { BlackboardService } from '../BlackboardService';
import { resolveInterruptBeforeNodes } from '../ApprovalPolicyEngine';
import { loadConfig } from '../CockpitExecutorConfig';
import { ReclassificationCheckpoint } from '../context/ReclassificationCheckpoint';


// The officially supported way to type State in LangGraph TS
export const PilotStateAnnotation = Annotation.Root({
  plane_issue_id: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  pipeline_run_id: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  thread_id: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  status: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => 'initialized',
  }),
  artifactLogs: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => x.concat(y),
    default: () => [],
  }),
  executionOptions: Annotation<{ mode: 'linear' | 'multiple_agents' | 'mock' }>({
    reducer: (x: { mode: 'linear' | 'multiple_agents' | 'mock' }, y: { mode: 'linear' | 'multiple_agents' | 'mock' }) => y ?? x,
    default: () => ({ mode: 'mock' })
  }),
  selected_pipeline: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => 'unified-task-intake',
  }),
  // Routing fields — set by routerNode, consumed by conditional edges
  intent: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => 'unknown',
  }),
  customAgents: Annotation<string[]>({
    reducer: (_: string[], y: string[]) => y,  // Replace, not concat
    default: () => [],
  }),
  messages: Annotation<{ role: string, content: string }[]>({
    reducer: (x: { role: string, content: string }[], y: { role: string, content: string }[]) => x.concat(y),
    default: () => [],
  }),
  projectId: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => 'agent_system',
  }),
  workspacePath: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => process.cwd(),
  }),
});

export type PilotState = typeof PilotStateAnnotation.State;

// ---------------------------------------------------------
// Helpers (Updated for Swarm)
// ---------------------------------------------------------

async function ensureDiscovery(projectRoot?: string): Promise<void> {
  if (AgentRegistry.getAllAgents().length === 0) {
    await DynamicDiscoveryService.discoverAll(projectRoot);
  }
}

function buildArtifactLog(params: {
  stage: string;
  role: string;
  status: 'completed' | 'fallback' | 'delegated_timeout' | 'blocked';
  source: 'llm' | 'fallback' | 'worker';
  message: string;
  fallbackCategory?: string;
}): string {
  const parts = [
    `[stage:${params.stage}]`,
    `[role:${params.role}]`,
    `[status:${params.status}]`,
    `[source:${params.source}]`,
    params.fallbackCategory ? `[fallback:${params.fallbackCategory}]` : '',
    `message=${params.message}`,
  ].filter(Boolean);
  return parts.join(' ');
}

function skillTelemetryContext(state: PilotState, stage: string) {
  return {
    runId: state.pipeline_run_id,
    ticketId: state.plane_issue_id,
    threadId: state.thread_id,
    pipelineId: state.selected_pipeline || 'runtime',
    stage,
    artifactLogs: state.artifactLogs || [],
    selectedPipeline: state.selected_pipeline,
  };
}

/**
 * DEPRECATED: Hardcoded nodes have been replaced by swarmNode.
 */

/**
 * NOTE: Hardcoded agent nodes (researchNode, traderNode, etc.) have been removed.
 * All pipeline execution is now handled dynamically by the swarmNode.
 */

// ---------------------------------------------------------
// Router Node — the entry point for every request
// Uses IntakeClassifier to determine the execution path.
// ---------------------------------------------------------

async function routerNode(state: PilotState): Promise<Partial<PilotState>> {
  const lastUserMessage = [...(state.messages || [])].filter((m) => m.role === 'user').pop();
  const userMessage =
    (lastUserMessage?.content || state.artifactLogs[0] || '').replace(/^User Message:\s*/i, '');
  const explicit = resolveExplicitDirectives(userMessage);

  if (explicit) {
    console.log(
      `[PilotGraph:Router] Explicit directive -> intent=${explicit.intent} pipeline=${explicit.pipeline}`
    );
    return {
      intent: explicit.intent,
      selected_pipeline: explicit.pipeline,
      customAgents: explicit.customAgents,
      status: `routed:explicit:${explicit.intent}`,
      artifactLogs: [
        buildArtifactLog({
          stage: 'router',
          role: 'Router',
          status: 'completed',
          source: 'llm',
          message: `[Router] Explicit directive accepted. Pipeline: ${explicit.pipeline}. Reason: ${explicit.reason}`,
        }),
      ],
    };
  }

  console.log('[PilotGraph:Router] Default routing -> unified-task-intake');
  return {
    intent: 'task',
    selected_pipeline: 'unified-task-intake',
    customAgents: [],
    status: 'routed:default-intake',
    artifactLogs: [
      buildArtifactLog({
        stage: 'router',
        role: 'Router',
        status: 'completed',
        source: 'llm',
        message:
          '[Router] Default route to unified-task-intake. PM orchestrator decides whether to answer directly or execute.',
      }),
    ],
  };
}

/**
 * The Swarm Node — the primary dynamic execution engine.
 * Discovers the next pipeline stage from documentation and executes the corresponding agent via AgentExecutor.
 */
async function swarmNode(state: PilotState): Promise<Partial<PilotState>> {
  await ensureDiscovery(state.workspacePath);
  
  const pipelineId = state.selected_pipeline || 'unified-task-intake';
  let pipelineDef = PipelineRegistry.getPipeline(pipelineId);
  if (!pipelineDef || !Array.isArray(pipelineDef.stages) || pipelineDef.stages.length === 0) {
    const fallbackAgent = AgentRegistry.getAllAgents()[0]?.slug || 'system-core';
    pipelineDef = {
      id: pipelineId,
      slug: pipelineId,
      name: pipelineId,
      title: pipelineId,
      description: 'Fallback synthesized pipeline',
      stages: [
        {
          id: 'intake',
          name: 'Fallback Intake',
          title: 'Fallback Intake',
          role: fallbackAgent,
          agent: fallbackAgent,
          description: 'Fallback stage',
          instructions: 'Fallback stage',
          nextAllowedRoles: [],
          completionCriteria: '',
        },
      ],
      sourcePath: 'runtime://fallback-pipeline',
    };
    PipelineRegistry.register(pipelineDef);
  }
  
  const currentStage = state.status.replace(/_completed$/, '');
  const nextStage = PipelineRegistry.getNextStage(pipelineId, currentStage);

  if (!nextStage) {
    console.log(`[PilotGraph:Swarm] No more stages in pipeline ${pipelineId}.`);
    return { status: 'pipeline_completed' };
  }

  console.log(`[PilotGraph:Swarm] Next stage: ${nextStage.id} (Agent: ${nextStage.agent})`);

  await emitSwarmEvent('stage.started', {
    runId: state.pipeline_run_id || '',
    threadId: state.thread_id || '',
    agent: { slug: nextStage.agent },
    pipeline: { id: pipelineId, currentStageId: nextStage.id },
    activeTicketId: state.plane_issue_id
  } as any, { agentId: nextStage.agent, pipelineId });

  // --- Step 2.3: Semantic Intake Gate (Simplified for Swarm) ---
  if (nextStage.id === 'intake') {
    // Semantic gate logic here if needed, or delegated to PM agent
  }

  // Assemble the execution context
  const history = (state.messages || [])
    .slice(-8)
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').slice(0, 3000),
    }));
  const agent =
    AgentRegistry.getAgent(nextStage.agent) ||
    AgentRegistry.getAllAgents()[0] ||
    {
      slug: nextStage.agent || 'system-core',
      name: nextStage.agent || 'System Core',
      title: nextStage.agent || 'System Core',
      callsign: nextStage.agent || 'System Core',
      mission: 'Execute assigned task.',
      description: 'Fallback synthesized agent profile.',
      instructions: '',
      owns: [],
      guardrails: [],
      skills: [],
      tools: [],
      fullInstructions: '',
      sourcePath: 'runtime://fallback-agent',
    };

  const runContext = await RunContextAssembler.assemble(
    agent,
    pipelineDef,
    nextStage.id,
    state.artifactLogs[0] || 'Execute project task',
    { history },
    { projectId: state.projectId, workspacePath: state.workspacePath }
  );

  const executor = new AgentExecutor();
  let result: { content: string };
  try {
    result = await executor.run(runContext);
  } catch (error: any) {
    const errMsg = error?.message || 'Unknown execution error';
    console.error(`[PilotGraph:Swarm] Stage ${nextStage.id} failed for agent ${runContext.agent.slug}:`, errMsg);
    return {
      status: `${nextStage.id}_completed`,
      messages: [{
        role: 'assistant',
        content: `[${runContext.agent.title}] Stage ${nextStage.id} failed; continuing pipeline with fallback. Error: ${errMsg}`,
      }],
      artifactLogs: [
        buildArtifactLog({
          stage: nextStage.id,
          role: runContext.agent.title,
          status: 'fallback',
          source: 'fallback',
          fallbackCategory: 'execution_error',
          message: `Stage failed: ${errMsg}`,
        }),
      ],
    };
  }

  // Check for intent drift (Phase 5)
  const drift = await ReclassificationCheckpoint.detectDrift(runContext, result.content);
  if (drift.shouldReroute) {
    console.log(`[PilotGraph:Swarm] Intent drift detected: ${drift.reason}. Rerouting...`);
    return {
      status: 'routed:reclassify',
      intent: drift.newIntent || state.intent,
      selected_pipeline: drift.newPipeline || state.selected_pipeline,
      artifactLogs: [
        buildArtifactLog({
          stage: nextStage.id,
          role: 'System',
          status: 'fallback',
          source: 'worker',
          message: `Drift detected: ${drift.reason}. Rerouting...`,
        }),
      ],
    };
  }

  emitEvent({
    event_type: 'swarm_stage_completed',
    plane_issue_id: state.plane_issue_id || '',
    pipeline_run_id: state.pipeline_run_id || '',
    thread_id: state.thread_id || '',
    agent_role: runContext.agent.title,
    source_stage: nextStage.id,
    status: 'success',
    correlation_id: state.pipeline_run_id || '',
    payload: { agentId: nextStage.agent, pipelineId, stageId: nextStage.id, outcome: 'success' }
  });

  return {
    status: `${nextStage.id}_completed`,
    messages: [{ role: 'assistant', content: result.content }],
    artifactLogs: [
      buildArtifactLog({
        stage: nextStage.id,
        role: runContext.agent.title,
        status: 'completed',
        source: 'llm',
        message: result.content.slice(0, 200) + (result.content.length > 200 ? '...' : ''),
      }),
    ],
  };
}

/**
 * Conditional edge for the swarm loop.
 */
function routeSwarm(state: PilotState): string {
  if (state.status === 'pipeline_completed') return 'finalize';
  return 'swarm';
}

/**
 * Finalize node for closing the pipeline.
 */
async function finalizeNode(state: PilotState): Promise<Partial<PilotState>> {
    console.log(`[PilotGraph:Finalize] Strategy/Feature lifecycle complete.`);
    
    await emitSwarmEvent('run.completed', {
        runId: state.pipeline_run_id || '',
        agent: { slug: 'system' },
        pipeline: { id: state.selected_pipeline || 'runtime', currentStageId: 'finalize' }
    } as any, { status: 'completed' });

    return {
        status: 'completed',
        artifactLogs: [
            buildArtifactLog({
                stage: 'finalize',
                role: 'System',
                status: 'completed',
                source: 'llm',
                message: 'All pipeline stages finished. Execution successful.',
            }),
        ],
    };
}

/**
 * Router always enters unified pipeline execution path.
 * Explicit directives may adjust pipeline id, but still execute via swarm.
 */
function routeByIntent(state: PilotState): string {
  if (state.selected_pipeline === 'custom' && state.customAgents.length > 0) {
    return 'custom_router';
  }
  return 'intake';
}

// ---------------------------------------------------------
// Unified Graph — single entry point with smart routing
// ---------------------------------------------------------

const checkpointer = new MemorySaver();


export const pilotGraph = new StateGraph(PilotStateAnnotation)
  // Entry: router selects pipeline id (explicit directive or default intake)
  .addNode('router', routerNode)
  // Swarm: dynamic pipeline executor
  .addNode('swarm', swarmNode)
  // Finalize: cleanup and documentation
  .addNode('finalize', finalizeNode)

  // START → router (always — first node for every request)
  .addEdge(START, 'router')

  // Router → unified execution path
  .addConditionalEdges('router', routeByIntent, {
    'intake': 'swarm', // Start swarm directly (it will find intake step)
    'custom_router': 'swarm', // For now, we use swarm for everything
  })

  // Swarm loop
  .addConditionalEdges('swarm', routeSwarm, {
    'swarm': 'swarm',
    'finalize': 'finalize',
  })

  .addEdge('finalize', END)

  .compile({
    checkpointer,
    interruptBefore: resolveInterruptBeforeNodes() as any,
  });

/**
 * Main execution entry point — unified graph with single execution path.
 * Explicit user directives can override pipeline/agents, but the runtime
 * always executes through the swarm pipeline loop.
 */
export async function executeQuasiLinearRun(initialState: Partial<PilotState>) {
  const threadConfig = { configurable: { thread_id: initialState.thread_id || 'default' } };
  const finalState = await pilotGraph.invoke(initialState, threadConfig);
  return finalState;
}
