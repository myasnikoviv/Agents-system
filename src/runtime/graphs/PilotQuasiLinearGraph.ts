import * as path from 'path';
import { StateGraph, START, END, MemorySaver, Annotation, interrupt, Command } from '@langchain/langgraph';
import { classifyRequest } from '../IntakeClassifier';
import { DynamicDiscoveryService } from '../DynamicDiscoveryService';
import { AgentRegistry } from '../registries/AgentRegistry';
import { PipelineRegistry } from '../registries/PipelineRegistry';
import { emitEvent, emitSwarmEvent } from '../events/EventBus';
import { RunContextAssembler } from '../context/RunContext';
import { AgentExecutor } from '../AgentExecutor';
import { BlackboardService } from '../BlackboardService';
import { resolveInterruptBeforeNodes, ApprovalPolicyEngine } from '../ApprovalPolicyEngine';
import { loadConfig } from '../CockpitExecutorConfig';
import { ReclassificationCheckpoint } from '../context/ReclassificationCheckpoint';
import { detectLanguage, type DetectedLanguage } from '../LanguageDetection';
import { buildContractRepromptInstruction, validateAgentResponseContract } from '../ResponseContractGuard';


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
  agentContextPath: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  preferredLanguage: Annotation<DetectedLanguage>({
    reducer: (_: DetectedLanguage, y: DetectedLanguage) => y,
    default: () => 'unknown',
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

function compactText(value: string, max = 220): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function isAgentStatusChainRequest(state: PilotState): boolean {
  const userMessage = [...(state.messages || [])]
    .reverse()
    .find((m) => m.role === 'user')?.content || '';
  const probe = String(userMessage || '').toLowerCase();
  if (!probe) return false;

  const hasChainIntent =
    probe.includes('test chain') ||
    probe.includes('тестовий ланцюг') ||
    probe.includes('кожен агент') ||
    probe.includes('через хендоф');
  const hasStatusIntent = probe.includes('status') || probe.includes('статус');
  return hasChainIntent && hasStatusIntent;
}

function buildContractFallbackMessage(state: PilotState, runContext: any, pipelineId: string, stageId: string): string {
  const callsign = runContext?.agent?.callsign || runContext?.agent?.title || runContext?.agent?.slug || 'Agent';
  const ticket = String(state.plane_issue_id || '').trim() || 'N/A';
  return [
    `Active role: ${callsign}`,
    `Pipeline: ${pipelineId || 'unified-task-intake'}`,
    `Stage: ${stageId}`,
    'Next: pm-orchestrator',
    `Ticket: ${ticket}`,
    `Git: branch=n/a | worktree=n/a`,
    '',
    'summary',
    'Відповідь переформатовано системою через порушення контракту формату.',
    '',
    'findings',
    '- Первинна відповідь не пройшла contract guard.',
    '- Виконано fallback-форматування для стабільності виводу.',
  ].join('\n');
}

function extractRetrySeconds(text: string): string | null {
  const retryInMatch = text.match(/retry in\s+([\d.]+)s/i);
  if (retryInMatch?.[1]) return String(Math.ceil(Number(retryInMatch[1])));
  const retryDelayMatch = text.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retryDelayMatch?.[1]) return retryDelayMatch[1];
  return null;
}

function summarizeExecutionError(language: DetectedLanguage, rawError: string, providerLabel = 'Execution provider'): string {
  const text = String(rawError || '').trim();
  const lower = text.toLowerCase();
  const retrySec = extractRetrySeconds(text);
  const missingBinaryMatch = text.match(/spawn\s+([^\s]+)\s+ENOENT/i);

  if (missingBinaryMatch?.[1]) {
    const bin = missingBinaryMatch[1];
    if (language === 'uk') {
      return `${providerLabel} не може запустити \`${bin}\`: виконуваний файл не знайдено в PATH (ENOENT). Встановіть CLI або перемкніть провайдера.`;
    }
    if (language === 'ru') {
      return `${providerLabel} не может запустить \`${bin}\`: исполняемый файл не найден в PATH (ENOENT). Установите CLI или переключите провайдера.`;
    }
    if (language === 'be') {
      return `${providerLabel} не можа запусціць \`${bin}\`: выканальны файл не знойдзены ў PATH (ENOENT). Усталюйце CLI або пераключыце правайдара.`;
    }
    return `${providerLabel} cannot start \`${bin}\`: executable was not found in PATH (ENOENT). Install the CLI or switch provider.`;
  }

  const quotaError =
    lower.includes('resource_exhausted') ||
    lower.includes('quota exceeded') ||
    lower.includes('too many requests') ||
    lower.includes(' 429');

  if (quotaError) {
    if (language === 'uk') {
      return retrySec
        ? `${providerLabel} тимчасово недоступний через ліміт запитів. Спробуйте повторити приблизно через ${retrySec} с.`
        : `${providerLabel} тимчасово недоступний через ліміт запитів. Спробуйте повторити трохи пізніше.`;
    }
    if (language === 'ru') {
      return retrySec
        ? `${providerLabel} временно недоступен из-за лимита запросов. Повторите примерно через ${retrySec} с.`
        : `${providerLabel} временно недоступен из-за лимита запросов. Повторите немного позже.`;
    }
    if (language === 'be') {
      return retrySec
        ? `${providerLabel} часова недаступны праз ліміт запытаў. Паўтарыце прыкладна праз ${retrySec} с.`
        : `${providerLabel} часова недаступны праз ліміт запытаў. Паўтарыце крыху пазней.`;
    }
    return retrySec
      ? `${providerLabel} is temporarily rate-limited. Please retry in about ${retrySec}s.`
      : `${providerLabel} is temporarily rate-limited. Please retry shortly.`;
  }

  if (lower.includes('timed out') || lower.includes('timeout')) {
    if (language === 'uk') return `${providerLabel} не встиг завершити запит вчасно (timeout). Спробуйте ще раз.`;
    if (language === 'ru') return `${providerLabel} не успел завершить запрос вовремя (timeout). Попробуйте снова.`;
    if (language === 'be') return `${providerLabel} не паспеў завяршыць запыт своечасова (timeout). Паспрабуйце яшчэ раз.`;
    return `${providerLabel} timed out while processing the request. Please retry.`;
  }

  const cleaned = compactText(
    text
      .replace(/\[Sidecar Error\]\s*/gi, '')
      .replace(/OpenHands reported execution status=error\s*\|\s*details=/gi, '')
      .replace(/Execution provider reported execution status=error\s*\|\s*details=/gi, '')
      .replace(/Execution failed:\s*/gi, '')
  );

  if (language === 'uk') return `${providerLabel} повернув помилку: ${cleaned}`;
  if (language === 'ru') return `${providerLabel} вернул ошибку: ${cleaned}`;
  if (language === 'be') return `${providerLabel} вярнуў памылку: ${cleaned}`;
  return `${providerLabel} returned an error: ${cleaned}`;
}

function localizeSystemMessage(
  language: DetectedLanguage,
  kind: 'stageFailed' | 'runCompleted',
  details?: { stageId?: string; error?: string; providerLabel?: string }
): string {
  if (kind === 'runCompleted') {
    if (language === 'uk') return 'Виконання завершено.';
    if (language === 'ru') return 'Выполнение завершено.';
    if (language === 'be') return 'Выкананне завершана.';
    return 'Run completed.';
  }

  const stageId = details?.stageId || 'unknown';
  const rawError = details?.error || 'Unknown execution error';
  const providerLabel = details?.providerLabel || 'Execution provider';
  const humanized = summarizeExecutionError(language, rawError, providerLabel);
  if (language === 'uk') {
    return `[System] Етап ${stageId} завершився помилкою; продовжую пайплайн із fallback. ${humanized}`;
  }
  if (language === 'ru') {
    return `[System] Этап ${stageId} завершился с ошибкой; продолжаю пайплайн с fallback. ${humanized}`;
  }
  if (language === 'be') {
    return `[System] Этап ${stageId} завяршыўся з памылкай; працягваю пайплайн з fallback. ${humanized}`;
  }
  return `[System] Stage ${stageId} failed; continuing pipeline with fallback. ${humanized}`;
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
  if (state.pipeline_run_id) {
    const { RunManager } = await import('../context/RunManager');
    RunManager.checkCancellation(state.pipeline_run_id);
  }
  const lastUserMessage = [...(state.messages || [])].filter((m) => m.role === 'user').pop();
  const userMessage =
    (lastUserMessage?.content || state.artifactLogs[0] || '').replace(/^User Message:\s*/i, '');
  const preferredLanguage = detectLanguage(userMessage);

  try {
    const classified = await classifyRequest(userMessage);
    const pipeline = String(classified.pipeline || '').trim() || 'unified-task-intake';
    const intent = String(classified.intent || '').trim() || 'unknown';
    const isExplicit = Boolean(classified.isExplicit);

    console.log(
      `[PilotGraph:Router] Dynamic routing -> intent=${intent} pipeline=${pipeline} explicit=${isExplicit} confidence=${classified.confidence}`
    );

    // ENF-006 — Pipeline Usage Soft Gate
    const { logPipelineUsageGate } = await import('../governance/PipelineUsageEnforcer');
    logPipelineUsageGate({
      ticketId: state.plane_issue_id || 'AGSYS-UNKNOWN',
      pipelineId: pipeline,
      isExplicit,
      confidence: classified.confidence || 1.0,
    });

    return {
      intent,
      selected_pipeline: pipeline,
      customAgents: Array.isArray(classified.customAgents) ? classified.customAgents : [],
      preferredLanguage,
      status: `routed:${isExplicit ? 'explicit' : 'dynamic'}:${intent}`,
      artifactLogs: [
        buildArtifactLog({
          stage: 'router',
          role: 'Router',
          status: 'completed',
          source: 'llm',
          message: `[Router] Dynamic route selected. Pipeline: ${pipeline}. Reason: ${classified.reason}`,
        }),
      ],
    };
  } catch (error: any) {
    console.warn('[PilotGraph:Router] classifyRequest failed, fallback to intake:', error?.message || error);
    return {
      intent: 'unknown',
      selected_pipeline: 'unified-task-intake',
      customAgents: [],
      preferredLanguage,
      status: 'routed:fallback:intake',
      artifactLogs: [
        buildArtifactLog({
          stage: 'router',
          role: 'Router',
          status: 'fallback',
          source: 'fallback',
          fallbackCategory: 'classification_error',
          message: '[Router] Classification failed; fallback to unified-task-intake.',
        }),
      ],
    };
  }
}

/**
 * The Swarm Node — the primary dynamic execution engine.
 * Discovers the next pipeline stage from documentation and executes the corresponding agent via AgentExecutor.
 */
async function swarmNode(state: PilotState): Promise<Partial<PilotState>> {
  if (state.pipeline_run_id) {
    const { RunManager } = await import('../context/RunManager');
    RunManager.checkCancellation(state.pipeline_run_id);
  }
  await ensureDiscovery(state.agentContextPath || state.workspacePath);

  if (isAgentStatusChainRequest(state)) {
    const pipelineId = 'unified-task-intake';
    const agents = AgentRegistry.getAllAgents();
    const messages: Array<{ role: string; content: string }> = [];

    for (let idx = 0; idx < agents.length; idx++) {
      const agent = agents[idx]!;
      const stageId = `status-chain-${idx + 1}`;

      await emitEvent({
        type: 'agent.started',
        runId: state.pipeline_run_id,
        projectId: state.projectId,
        chainId: state.thread_id,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: { pipelineId, stageId },
      });

      if (idx > 0) {
        const fromAgent = agents[idx - 1]!;
        await emitEvent({
          type: 'swarm.handoff',
          runId: state.pipeline_run_id,
          projectId: state.projectId,
          chainId: state.thread_id,
          actor: { type: 'system', id: 'swarm' },
          payload: {
            pipelineId,
            fromAgentId: fromAgent.slug,
            toAgentId: agent.slug,
          },
        });
      }

      const content = [
        `Active role: ${agent.callsign || agent.title || agent.slug}`,
        `Pipeline: ${pipelineId}`,
        `Stage: ${stageId}`,
        `Next: ${idx < agents.length - 1 ? agents[idx + 1]!.slug : 'finalize'}`,
        `Ticket: ${state.plane_issue_id || 'N/A'}`,
        'Git: branch=unknown | worktree=unknown',
        '',
        'summary',
        `Агент ${agent.slug} на звʼязку.`,
        '',
        'findings',
        '- status: standby',
      ].join('\n');

      await emitEvent({
        type: 'agent.completed',
        runId: state.pipeline_run_id,
        projectId: state.projectId,
        chainId: state.thread_id,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          pipelineId,
          stageId,
          outcome: 'success',
        },
      });

      messages.push({ role: 'assistant', content });
    }

    return {
      status: 'pipeline_completed',
      selected_pipeline: pipelineId,
      messages,
      artifactLogs: [
        buildArtifactLog({
          stage: 'status-chain',
          role: 'System',
          status: 'completed',
          source: 'worker',
          message: `Broadcast status chain completed for ${agents.length} agents.`,
        }),
      ],
    };
  }
  
  const pipelineId = state.selected_pipeline || 'unified-task-intake';
  let pipelineDef = PipelineRegistry.getPipeline(pipelineId);
  if (!pipelineDef || !Array.isArray(pipelineDef.stages) || pipelineDef.stages.length === 0) {
    const fallbackAgent =
      AgentRegistry.getAgent('pm-orchestrator')?.slug ||
      AgentRegistry.getAllAgents()[0]?.slug ||
      'system-core';
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
  const hasCompletedRealStage = /_completed$/.test(String(state.status || ''));
  const needsPmEntry = !hasCompletedRealStage && currentStage !== 'pm-entry';

  const pmAgentProfile =
    AgentRegistry.getAgent('pm-orchestrator') ||
    AgentRegistry.getAllAgents()[0];

  const nextStage = needsPmEntry
    ? {
        id: 'pm-entry',
        name: 'PM Entry Stage',
        title: 'PM Entry Stage',
        role: 'pm-orchestrator',
        agent: pmAgentProfile?.slug || 'pm-orchestrator',
        description: 'Mandatory PM-first entry gate before pipeline execution.',
        instructions: 'PM-first entry gate',
        nextAllowedRoles: [],
        completionCriteria: '',
      }
    : PipelineRegistry.getNextStage(pipelineId, currentStage);

  const executionPipelineDef = needsPmEntry
    ? {
        ...pipelineDef,
        id: `${pipelineDef.id}::pm-entry`,
        slug: `${pipelineDef.slug}::pm-entry`,
        title: `${pipelineDef.title} (PM Entry)`,
        stages: [nextStage as any],
      }
    : pipelineDef;

  if (!nextStage) {
    console.log(`[PilotGraph:Swarm] No more stages in pipeline ${pipelineId}.`);
    return { status: 'pipeline_completed' };
  }

  if (!needsPmEntry) {
    const previousStage = pipelineDef.stages.find((stage) => stage.id === currentStage);
    const fromAgent = String(previousStage?.agent || '').trim();
    const toAgent = String(nextStage.agent || '').trim();
    if (fromAgent && toAgent && fromAgent !== toAgent) {
      await emitEvent({
        type: 'swarm.handoff',
        runId: state.pipeline_run_id,
        projectId: state.projectId,
        chainId: state.thread_id,
        actor: { type: 'system', id: 'swarm' },
        payload: {
          pipelineId,
          fromAgentId: fromAgent,
          toAgentId: toAgent,
        },
      });
    }
  }

  console.log(`[PilotGraph:Swarm] Next stage: ${nextStage.id} (Agent: ${nextStage.agent})`);

  await emitEvent({
    type: 'agent.started',
    runId: state.pipeline_run_id,
    projectId: state.projectId,
    chainId: state.thread_id,
    actor: { type: 'agent', id: nextStage.agent, role: nextStage.agent },
    payload: {
      pipelineId,
      stageId: nextStage.id,
    },
  });

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
    executionPipelineDef as any,
    nextStage.id,
    state.artifactLogs[0] || 'Execute project task',
    { history, threadId: state.thread_id, runId: state.pipeline_run_id },
    { preferredLanguage: state.preferredLanguage },
    { projectId: state.projectId, workspacePath: state.workspacePath }
  );

  const executor = new AgentExecutor();
  let result: { content: string };
  const backend = loadConfig(state.workspacePath).backend;
  const providerLabel =
    backend === 'codex-cli'
      ? 'Codex CLI'
      : backend === 'claude-cli'
        ? 'Claude CLI'
        : backend === 'openhands-sdk'
          ? 'OpenHands'
          : 'Execution provider';

  // Ticket 315: Dynamic HITL Interrupts based on ApprovalPolicyEngine
  if (ApprovalPolicyEngine.getInstance().shouldInterrupt(agent.slug, runContext, 'interrupt_before')) {
    await emitEvent({
      type: 'agent.waiting_for_approval' as any, // Need to add this to union or cast
      runId: state.pipeline_run_id,
      projectId: state.projectId,
      chainId: state.thread_id,
      actor: { type: 'agent', id: agent.slug, role: agent.slug },
      payload: {
        pipelineId,
        stageId: nextStage.id,
        reason: 'Policy-based HITL trigger',
      },
    });

    const decision = interrupt({
      reason: 'approval_required',
      agent: agent.slug,
      stageId: nextStage.id,
      message: `Approving ${agent.slug} for stage ${nextStage.id}`,
    });
    
    console.log(`[PilotGraph:Swarm] Resumed after HITL interrupt for ${agent.slug}. Decision:`, decision);
  }

  try {
    result = await executor.run(runContext);
  } catch (error: any) {
    const errMsg = error?.message || 'Unknown execution error';
    console.error(`[PilotGraph:Swarm] Stage ${nextStage.id} failed for agent ${runContext.agent.slug}:`, errMsg);
    return {
      status: `${nextStage.id}_completed`,
      messages: [{
        role: 'assistant',
        content: localizeSystemMessage(state.preferredLanguage, 'stageFailed', {
          stageId: nextStage.id,
          error: errMsg,
          providerLabel,
        }),
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

  // Enforce AGENTS.md response contract with a single auto-reprompt recovery.
  let contractValidation = validateAgentResponseContract(result.content);
  result.content = contractValidation.normalizedText;
  if (!contractValidation.ok) {
    const validationErrors = contractValidation.errors;
    await emitEvent({
      type: 'agent.failed',
      runId: state.pipeline_run_id,
      projectId: state.projectId,
      chainId: state.thread_id,
      actor: { type: 'agent', id: runContext.agent.slug, role: runContext.agent.slug },
      payload: {
        pipelineId,
        stageId: nextStage.id,
        errors: validationErrors,
        reason: 'response_contract_violation',
      },
    });

    const repromptInstruction = buildContractRepromptInstruction(
      state.preferredLanguage,
      validationErrors,
      result.content
    );
    const repromptContext = {
      ...runContext,
      memory: {
        ...runContext.memory,
        threadHistory: [
          ...(runContext.memory.threadHistory || []),
          { role: 'assistant' as const, content: result.content },
          { role: 'user' as const, content: repromptInstruction },
        ],
      },
    };

    try {
      result = await executor.run(repromptContext as any);
    } catch (error: any) {
      const errMsg = error?.message || 'Unknown execution error';
      return {
        status: `${nextStage.id}_completed`,
        messages: [{
          role: 'assistant',
          content: localizeSystemMessage(state.preferredLanguage, 'stageFailed', {
            stageId: nextStage.id,
            error: errMsg,
            providerLabel,
          }),
        }],
        artifactLogs: [
          buildArtifactLog({
            stage: nextStage.id,
            role: runContext.agent.title,
            status: 'fallback',
            source: 'fallback',
            fallbackCategory: 'execution_error',
            message: `Reprompt failed: ${errMsg}`,
          }),
        ],
      };
    }

    contractValidation = validateAgentResponseContract(result.content);
    result.content = contractValidation.normalizedText;
    if (!contractValidation.ok) {
      result.content = buildContractFallbackMessage(state, runContext, pipelineId, nextStage.id);
      contractValidation = validateAgentResponseContract(result.content);
    }
  }

  await emitEvent({
    type: contractValidation.ok ? 'agent.completed' : 'agent.failed',
    runId: state.pipeline_run_id,
    projectId: state.projectId,
    chainId: state.thread_id,
    actor: { type: 'agent', id: runContext.agent.slug, role: runContext.agent.slug },
    payload: {
      pipelineId,
      stageId: nextStage.id,
      errors: contractValidation.ok ? [] : contractValidation.errors,
      outcome: contractValidation.ok ? 'success' : 'failed',
    },
  });

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
  
  // ENF-003 — Improvement Loop Soft Gate
  const { logImprovementLoopGate } = await import('../governance/ImprovementLoopEnforcer');
  logImprovementLoopGate({
    ticket: state.plane_issue_id || 'AGSYS-UNKNOWN',
    projectId: state.projectId,
    workspacePath: state.workspacePath
  });

  await emitEvent({
    type: 'run.completed',
    runId: state.pipeline_run_id,
    projectId: state.projectId,
    chainId: state.thread_id,
    actor: { type: 'system', id: 'system-core' },
    payload: { status: 'completed' },
  });

  return { status: 'completed' };
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

/**
 * Resumes an interrupted run.
 */
export async function resumeQuasiLinearRun(threadId: string, decision: any) {
  const threadConfig = { configurable: { thread_id: threadId } };
  // Use Command({ resume: decision }) to pass value back to interrupt()
  const finalState = await pilotGraph.invoke(new Command({ resume: decision }), threadConfig);
  return finalState;
}
