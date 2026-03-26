import * as path from 'path';
import { StateGraph, START, END, MemorySaver, Annotation } from '@langchain/langgraph';
import { classifyRequest } from '../IntakeClassifier';
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

async function safeRunRole(
  roleSlug: string,
  prompt: string,
  fallbackMessage: string,
  context?: { 
    runId?: string; 
    ticketId?: string; 
    threadId?: string; 
    pipelineId?: string; 
    stage?: string;
    artifactLogs?: string[];
    selectedPipeline?: string;
  },
  history: { role: string, content: string }[] = [],
): Promise<{ message: string; source: 'llm' | 'fallback'; fallbackCategory?: string }> {
  try {
    const executor = new AgentExecutor();
    const agent =
      AgentRegistry.getAgent(roleSlug) ||
      AgentRegistry.getAllAgents()[0] ||
      {
        slug: roleSlug,
        name: roleSlug,
        title: roleSlug,
        callsign: roleSlug,
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
    const pipeline =
      PipelineRegistry.getPipeline(context?.pipelineId || 'legacy') ||
      {
        id: context?.pipelineId || 'legacy',
        slug: context?.pipelineId || 'legacy',
        name: context?.pipelineId || 'Legacy',
        title: context?.pipelineId || 'Legacy',
        description: 'Fallback synthesized pipeline.',
        stages: [
          {
            id: context?.stage || 'respond',
            name: 'Respond Stage',
            title: 'Respond Stage',
            role: roleSlug,
            agent: agent.slug,
            description: 'Fallback stage',
            instructions: 'Fallback stage',
            nextAllowedRoles: [],
            completionCriteria: '',
          },
        ],
        sourcePath: 'runtime://fallback-pipeline',
      };

    const runContext = await RunContextAssembler.assemble(
      agent,
      pipeline,
      context?.stage || 'legacy',
      prompt,
      { history },
      { projectId: 'agent_system', workspacePath: process.cwd() } // Conversational defaults to cwd for now
    );
    const result = await executor.run(runContext);
    return {
      message: result.content,
      source: 'llm',
    };
  } catch (e) {
    console.error(`[safeRunRole] Error executing ${roleSlug}:`, e);
    return {
      message: fallbackMessage,
      source: 'fallback',
      fallbackCategory: 'execution_error'
    };
  }
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
  const userMessage = state.artifactLogs[0] || '';
  console.log(`[PilotGraph:Router] Classifying request: "${userMessage.slice(0, 80)}..."`);

  const classification = await classifyRequest(userMessage);

  console.log(`[PilotGraph:Router] Intent=${classification.intent} | Pipeline=${classification.pipeline} | Confidence=${classification.confidence} | Explicit=${classification.isExplicit}`);
  console.log(`[PilotGraph:Router] Reason: ${classification.reason}`);

  return {
    intent: classification.intent,
    selected_pipeline: classification.pipeline,
    customAgents: classification.customAgents,
    status: `routed:${classification.intent}`,
    artifactLogs: [
      buildArtifactLog({
        stage: 'router',
        role: 'Router',
        status: 'completed',
        source: 'llm',
        message: classification.intent === 'conversational'
          ? 'Classified as conversational Q&A.'
          : `[Router] Intent: ${classification.intent} (confidence: ${(classification.confidence * 100).toFixed(0)}%) | Pipeline: ${classification.pipeline} | ${classification.isExplicit ? 'Explicit directive' : 'Auto-classified'} | Reason: ${classification.reason}`,
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
  if (!pipelineDef) {
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
  const agent = AgentRegistry.getAgent(nextStage.agent) || AgentRegistry.getAllAgents()[0];
  if (!agent) {
    console.warn(`[PilotGraph:Swarm] Agent ${nextStage.agent} not found and no fallback agents available. Terminating.`);
    return { status: 'pipeline_completed' };
  }

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
  if (state.status === 'intake_blocked') return 'respond';
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
 * Conditional router function — called after routerNode completes.
 * Returns the name of the next node based on the classified intent.
 *
 * Supports:
 * - 'conversational' → single respond node
 * - 'new-feature' | 'bug-fix' | 'refactor' | 'strategy-tuning' | '*' → full intake pipeline
 * - 'research' → intake → research (partial pipeline)
 * - 'custom' → customStartNode which begins a dynamic agent sequence
 */
function routeByIntent(state: PilotState): string {
  const intent = state.intent || 'unknown';

  if (intent === 'conversational') return 'respond';
  if (intent === 'custom' && state.customAgents.length > 0) return 'custom_router';
  // All task intents (new-feature, bug-fix, refactor, research, strategy-tuning, etc.) → full pipeline
  return 'intake';
}

/**
 * Conversational response node — PM Orchestrator answers directly.
 */
async function conversationalNode(state: PilotState): Promise<Partial<PilotState>> {
  console.log(`[PilotGraph] Conversational mode: answering directly via PM Orchestrator...`);
  await ensureDiscovery(state.workspacePath);
  
  const lastUserMsg = [...(state.messages || [])].filter(m => m.role === 'user').pop();
  const userMessage = lastUserMsg ? lastUserMsg.content : (state.artifactLogs[0] || '').replace(/User Message: /, '');
  const history = (state.messages || []).slice(0, -1);

  const message = await safeRunRole(
    'pm-orchestrator',
    userMessage,
    `I'm your AI assistant for the trade-bot project. I'm ready to help! What would you like to know?`,
    {
      runId: state.pipeline_run_id,
      ticketId: state.plane_issue_id,
      threadId: state.thread_id,
      pipelineId: 'conversational',
      stage: 'respond',
      artifactLogs: state.artifactLogs || [],
      selectedPipeline: 'conversational',
    },
    history
  );

  return {
    status: 'conversational_done',
    messages: [{ role: 'assistant', content: message.message }],
    artifactLogs: [
      buildArtifactLog({
        stage: 'respond',
        role: 'PM Orchestrator',
        status: message.source === 'llm' ? 'completed' : 'fallback',
        source: message.source,
        fallbackCategory: message.fallbackCategory,
        message: 'Answered user request.',
      }),
    ],
  };
}

// ---------------------------------------------------------
// Unified Graph — single entry point with smart routing
// ---------------------------------------------------------

const checkpointer = new MemorySaver();


export const pilotGraph = new StateGraph(PilotStateAnnotation)
  // Entry: router classifies the intent
  .addNode('router', routerNode)
  // Conversational: single PM response node
  .addNode('respond', conversationalNode)
  // Swarm: dynamic pipeline executor
  .addNode('swarm', swarmNode)
  // Finalize: cleanup and documentation
  .addNode('finalize', finalizeNode)

  // START → router (always — first node for every request)
  .addEdge(START, 'router')

  // Router → conditional branch based on LLM-classified intent
  .addConditionalEdges('router', routeByIntent, {
    'respond': 'respond',
    'intake': 'swarm', // Start swarm directly (it will find intake step)
    'custom_router': 'swarm', // For now, we use swarm for everything
  })

  // Conversational → done immediately
  .addEdge('respond', END)

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
 * Main execution entry point — the unified graph with smart routing.
 * Automatically classifies the request via LLM and routes to the correct path.
 *
 * Routing paths:
 * - conversational → PM Orchestrator answers directly (1 node)
 * - new-feature / bug-fix / refactor / strategy-tuning → full 11-stage pipeline
 * - research → partial pipeline (intake → research → END)
 * - custom (agent: X, Y) → selected agent sequence
 */
export async function executeQuasiLinearRun(initialState: Partial<PilotState>) {
  const threadConfig = { configurable: { thread_id: initialState.thread_id || 'default' } };
  const finalState = await pilotGraph.invoke(initialState, threadConfig);
  return finalState;
}

/**
 * Explicit conversational run — forces conversational intent (skips LLM classification).
 * @deprecated Prefer executeQuasiLinearRun — the router handles this automatically.
 */
export async function executeConversationalRun(initialState: Partial<PilotState>) {
  return executeQuasiLinearRun({
    ...initialState,
    intent: 'conversational',
    selected_pipeline: 'conversational',
  });
}
