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
import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { QueueAbstractionLayer } from '../queue/QueueAbstractionLayer';
import { WorkerExecutionEngine } from '../workers/WorkerExecutionEngine';
import { InterAgentCommunication } from '../workers/InterAgentCommunication';


// The officially supported way to type State in LangGraph TS
export const PilotStateAnnotation = Annotation.Root({
  ticketId: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  runId: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  threadId: Annotation<string>({
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
  executionOptions: Annotation<{ mode: 'multiple_agents' }>({
    reducer: (x: { mode: 'multiple_agents' }, y: { mode: 'multiple_agents' }) => y ?? x,
    default: () => ({ mode: 'multiple_agents' })
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
  requestedSkills: Annotation<string[]>({
    reducer: (_: string[], y: string[]) => y,
    default: () => [],
  }),
  enforcement: Annotation<{ pipeline?: string; skills?: string[] }>({
    reducer: (_: { pipeline?: string; skills?: string[] }, y: { pipeline?: string; skills?: string[] }) => y,
    default: () => ({ pipeline: undefined, skills: [] }),
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
  status: 'completed' | 'recovered' | 'delegated_timeout' | 'blocked';
  source: 'llm' | 'system' | 'worker';
  message: string;
  recoveryCategory?: string;
}): string {
  const parts = [
    `[stage:${params.stage}]`,
    `[role:${params.role}]`,
    `[status:${params.status}]`,
    `[source:${params.source}]`,
    params.recoveryCategory ? `[recovery:${params.recoveryCategory}]` : '',
    `message=${params.message}`,
  ].filter(Boolean);
  return parts.join(' ');
}

function skillTelemetryContext(state: PilotState, stage: string) {
  return {
    runId: state.runId,
    ticketId: state.ticketId,
    threadId: state.threadId,
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

function buildContractRecoveryMessage(
  state: PilotState,
  runContext: any,
  pipelineId: string,
  stageId: string,
  validationErrors: string[],
  rawResponse: string
): string {
  const callsign = runContext?.agent?.callsign || runContext?.agent?.title || runContext?.agent?.slug || 'Agent';
  const ticket = String(state.ticketId || '').trim() || 'N/A';
  const normalizedErrors = Array.isArray(validationErrors) && validationErrors.length > 0
    ? validationErrors
    : ['Unknown contract validation error'];
  const rawExcerpt = compactText(String(rawResponse || '').trim(), 500);
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
    ...normalizedErrors.map((err) => `- ${err}`),
    '- Виконано авто-форматування для стабільності виводу.',
    '',
    'original_response_excerpt',
    rawExcerpt || '(empty)',
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
  const looksLikeOpenHands = providerLabel.toLowerCase().includes('openhands');

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

  const billingError =
    lower.includes('insufficient_quota') ||
    lower.includes('billing') ||
    lower.includes('payment required') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('authentication failed');
  if (billingError) {
    if (language === 'uk') {
      return `${providerLabel} не зміг виконати запит через проблему з білінгом/доступом до моделі. Перевірте оплату, ліміти та API-ключ провайдера, потім повторіть запуск.`;
    }
    if (language === 'ru') {
      return `${providerLabel} не смог выполнить запрос из-за проблемы с биллингом/доступом к модели. Проверьте оплату, лимиты и API-ключ провайдера, затем повторите запуск.`;
    }
    if (language === 'be') {
      return `${providerLabel} не змог выканаць запыт праз праблему з білінгам/доступам да мадэлі. Праверце аплату, ліміты і API-ключ правайдара, пасля паўтарыце запуск.`;
    }
    return `${providerLabel} could not complete the request due to model billing/access issues. Check billing, limits, and provider API key, then retry.`;
  }

  if (lower.includes('timed out') || lower.includes('timeout')) {
    if (looksLikeOpenHands) {
      if (language === 'uk') {
        return `${providerLabel} не отримав завершену відповідь вчасно. Це timeout на стороні провайдера/оркестратора. Перевірте стан OpenHands, доступність моделі та повторіть запуск.`;
      }
      if (language === 'ru') {
        return `${providerLabel} не получил завершенный ответ вовремя. Это timeout на стороне провайдера/оркестратора. Проверьте состояние OpenHands, доступность модели и повторите запуск.`;
      }
      if (language === 'be') {
        return `${providerLabel} не атрымаў завершаны адказ своечасова. Гэта timeout на баку правайдара/аркестратара. Праверце стан OpenHands, даступнасць мадэлі і паўтарыце запуск.`;
      }
      return `${providerLabel} did not return a completed response in time. This is a provider/orchestrator timeout. Check OpenHands health, model availability, and retry.`;
    }
    if (language === 'uk') return `${providerLabel} не встиг завершити запит вчасно (timeout). Спробуйте ще раз.`;
    if (language === 'ru') return `${providerLabel} не успел завершить запрос вовремя (timeout). Попробуйте снова.`;
    if (language === 'be') return `${providerLabel} не паспеў завяршыць запыт своечасова (timeout). Паспрабуйце яшчэ раз.`;
    return `${providerLabel} timed out while processing the request. Please retry.`;
  }

  if (lower.includes('maximum run time') || lower.includes('stage_timeout_exceeded')) {
    if (looksLikeOpenHands) {
      if (language === 'uk') {
        return `${providerLabel} перевищив ліміт часу виконання. Це означає, що відповідь не була завершена в межах runtime timeout. Перевірте стан OpenHands та доступність моделі, потім повторіть запит.`;
      }
      if (language === 'ru') {
        return `${providerLabel} превысил лимит времени выполнения. Это значит, что ответ не был завершен в пределах runtime timeout. Проверьте состояние OpenHands и доступность модели, затем повторите запрос.`;
      }
      if (language === 'be') {
        return `${providerLabel} перавысіў ліміт часу выканання. Гэта значыць, што адказ не быў завершаны ў межах runtime timeout. Праверце стан OpenHands і даступнасць мадэлі, пасля паўтарыце запыт.`;
      }
      return `${providerLabel} exceeded execution time limit. The response was not completed within runtime timeout. Check OpenHands health and model availability, then retry.`;
    }
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
    return `[System] Етап ${stageId} завершився помилкою; продовжую пайплайн із recovery. ${humanized}`;
  }
  if (language === 'ru') {
    return `[System] Этап ${stageId} завершился с ошибкой; продолжаю пайплайн с recovery. ${humanized}`;
  }
  if (language === 'be') {
    return `[System] Этап ${stageId} завяршыўся з памылкай; працягваю пайплайн з recovery. ${humanized}`;
  }
  return `[System] Stage ${stageId} failed; continuing pipeline with recovery. ${humanized}`;
}

async function runWithStageTimeout<T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`stage_timeout_exceeded:${label}:${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
  if (state.runId) {
    const { RunManager } = await import('../context/RunManager');
    RunManager.checkCancellation(state.runId);
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
      ticketId: state.ticketId || 'AGSYS-UNKNOWN',
      runId: state.runId,
      chainId: state.threadId,
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
    console.warn('[PilotGraph:Router] classifyRequest failed, recover to intake:', error?.message || error);
    return {
      intent: 'unknown',
      selected_pipeline: 'unified-task-intake',
      customAgents: [],
      preferredLanguage,
      status: 'routed:recovery:intake',
      artifactLogs: [
        buildArtifactLog({
          stage: 'router',
          role: 'Router',
          status: 'recovered',
          source: 'system',
          recoveryCategory: 'classification_error',
          message: '[Router] Classification failed; recover to unified-task-intake.',
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
  if (state.runId) {
    const { RunManager } = await import('../context/RunManager');
    RunManager.checkCancellation(state.runId);
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
        runId: state.runId,
        projectId: state.projectId,
        chainId: state.threadId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: { pipelineId, stageId, stageTitle: stageId },
      });

      if (idx > 0) {
        const fromAgent = agents[idx - 1]!;
        await emitEvent({
          type: 'swarm.handoff',
          runId: state.runId,
          projectId: state.projectId,
          chainId: state.threadId,
          actor: { type: 'system', id: 'swarm' },
          payload: {
            pipelineId,
            fromAgentId: fromAgent.slug,
            toAgentId: agent.slug,
            toStageId: stageId,
            toStageTitle: stageId,
          },
        });
      }

      const content = [
        `Active role: ${agent.callsign || agent.title || agent.slug}`,
        `Pipeline: ${pipelineId}`,
        `Stage: ${stageId}`,
        `Next: ${idx < agents.length - 1 ? agents[idx + 1]!.slug : 'finalize'}`,
        `Ticket: ${state.ticketId || 'N/A'}`,
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
        runId: state.runId,
        projectId: state.projectId,
        chainId: state.threadId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          pipelineId,
          stageId,
          stageTitle: stageId,
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
    const defaultAgent =
      AgentRegistry.getAgent('pm-orchestrator')?.slug ||
      AgentRegistry.getAllAgents()[0]?.slug ||
      'system-core';
    pipelineDef = {
      id: pipelineId,
      slug: pipelineId,
      name: pipelineId,
      title: pipelineId,
      description: 'Default synthesized pipeline',
      stages: [
        {
          id: 'intake',
          name: 'Default Intake',
          title: 'Default Intake',
          role: defaultAgent,
          agent: defaultAgent,
          description: 'Default stage',
          instructions: 'Default stage',
          nextAllowedRoles: [],
          completionCriteria: '',
        },
      ],
      sourcePath: 'runtime://default-pipeline',
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
      await InterAgentCommunication.publishHandoff({
        runId: state.runId,
        projectId: state.projectId,
        chainId: state.threadId,
        pipelineId,
        fromAgentId: fromAgent,
        toAgentId: toAgent,
        toStageId: String(nextStage.id || '').trim(),
        toStageTitle: String(nextStage.title || nextStage.name || nextStage.id || '').trim(),
      });
    }
  }

  console.log(`[PilotGraph:Swarm] Next stage: ${nextStage.id} (Agent: ${nextStage.agent})`);
  const queueTask = await QueueAbstractionLayer.enqueue({
    runId: state.runId,
    projectId: state.projectId,
    chainId: state.threadId,
    pipelineId,
    stageId: String(nextStage.id || '').trim(),
    agentSlug: String(nextStage.agent || '').trim() || 'system-core',
    payload: {
      stageTitle: String(nextStage.title || nextStage.name || nextStage.id || '').trim(),
      queueDepth: await QueueAbstractionLayer.depth(state.projectId),
    },
  });
  await emitEvent({
    type: 'task.queued',
    runId: state.runId,
    projectId: state.projectId,
    chainId: state.threadId,
    actor: { type: 'system', id: 'dispatch-queue' },
    payload: {
      taskId: queueTask.taskId,
      stageId: queueTask.stageId,
      agentSlug: queueTask.agentSlug,
      queueDepth: await QueueAbstractionLayer.depth(state.projectId, queueTask.agentSlug),
    },
  });
  const pickedLease = await QueueAbstractionLayer.dequeue({
    projectId: state.projectId,
    agentSlug: queueTask.agentSlug,
    consumerId: `dispatcher:${state.runId}`,
    environmentId: String((state as any).environmentId || '').trim() || undefined,
  });
  if (!pickedLease) {
    throw new Error(`Dispatch queue pickup failed for ${state.projectId}:${queueTask.agentSlug}`);
  }
  const pickedTask = pickedLease.task;
  await QueueAbstractionLayer.ack(pickedLease.leaseId);
  await emitEvent({
    type: 'task.dispatched',
    runId: state.runId,
    projectId: state.projectId,
    chainId: state.threadId,
    actor: { type: 'system', id: 'dispatch-queue' },
    payload: {
      taskId: pickedTask.taskId,
      stageId: pickedTask.stageId,
      agentSlug: pickedTask.agentSlug,
      queuedForMs: Math.max(0, Date.now() - pickedTask.enqueuedAt),
      queueDepthAfterPickup: await QueueAbstractionLayer.depth(state.projectId, pickedTask.agentSlug),
    },
  });

  const workerLease = await DynamicWorkerSpawnManager.ensureWorker({
    runId: state.runId,
    projectId: state.projectId,
    tenantId: String((state as any).tenantId || '').trim() || undefined,
    workspaceId: String((state as any).workspaceId || '').trim() || undefined,
    environmentId: String((state as any).environmentId || '').trim() || undefined,
    chainId: state.threadId,
    agentSlug: String(nextStage.agent || '').trim() || 'system-core',
    taskId: pickedTask.taskId,
    stageId: pickedTask.stageId,
    pipelineId: pickedTask.pipelineId,
  });

  await emitEvent({
    type: 'agent.started',
    runId: state.runId,
    projectId: state.projectId,
    chainId: state.threadId,
    actor: { type: 'agent', id: nextStage.agent, role: nextStage.agent },
    payload: {
      pipelineId,
      stageId: nextStage.id,
      stageTitle: String(nextStage.title || nextStage.name || nextStage.id || '').trim(),
      workerId: workerLease.worker.workerId,
      workerIdentityKey: workerLease.worker.identityKey,
      workerSpawned: workerLease.spawned,
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
      description: 'Default synthesized agent profile.',
      instructions: '',
      owns: [],
      guardrails: [],
      skills: [],
      tools: [],
      fullInstructions: '',
      sourcePath: 'runtime://default-agent',
    };

  const buildRunContext = async (workerId: string) =>
    RunContextAssembler.assemble(
      agent,
      executionPipelineDef as any,
      nextStage.id,
      state.artifactLogs[0] || 'Execute project task',
      {
        history,
        threadId: state.threadId,
        runId: state.runId,
        workerId,
        tenantId: String((state as any).tenantId || '').trim() || undefined,
        workspaceId: String((state as any).workspaceId || '').trim() || undefined,
        environmentId: String((state as any).environmentId || '').trim() || undefined,
      },
      { preferredLanguage: state.preferredLanguage },
      { projectId: state.projectId, workspacePath: state.workspacePath }
    );

  let runContext = await buildRunContext(workerLease.worker.workerId);

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
      runId: state.runId,
      projectId: state.projectId,
      chainId: state.threadId,
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

  const stageTimeoutMs = Number(process.env.RUNTIME_STAGE_TIMEOUT_MS || 60000);
  const heartbeatIntervalMs = Math.max(1000, Number(process.env.RUNTIME_WORKER_HEARTBEAT_INTERVAL_MS || 5000));
  const heartbeatInput = {
    runId: state.runId,
    projectId: state.projectId,
    tenantId: String((state as any).tenantId || '').trim() || undefined,
    workspaceId: String((state as any).workspaceId || '').trim() || undefined,
    environmentId: String((state as any).environmentId || '').trim() || undefined,
    chainId: state.threadId,
    agentSlug: runContext.agent.slug,
  };
  const heartbeatTimer = setInterval(() => {
    void DynamicWorkerSpawnManager.heartbeat(heartbeatInput).catch(() => undefined);
  }, heartbeatIntervalMs);
  const stopHeartbeat = () => clearInterval(heartbeatTimer);
  await DynamicWorkerSpawnManager.heartbeat(heartbeatInput).catch(() => undefined);

  const runInConfiguredMode = async () => {
    await emitEvent({
      type: 'system.thought',
      runId: state.runId,
      projectId: state.projectId,
      chainId: state.threadId,
      actor: { type: 'system', id: 'runtime-router' },
      payload: {
        stageId: nextStage.id,
        agentSlug: runContext.agent.slug,
        workerId: runContext.memory?.workerId || workerLease.worker.workerId,
        executionTransport: 'subprocess',
      },
    });
    const execution = await WorkerExecutionEngine.executeTask({
      runContext,
      timeoutMs: stageTimeoutMs,
      stageId: String(nextStage.id || ''),
      agentSlug: String(runContext.agent.slug || ''),
    });
    if (!execution.ok) {
      throw new Error(execution.error || 'worker_execution_failed');
    }
    return { content: execution.content };
  };

  try {
    result = await runInConfiguredMode();
  } catch (error: any) {
    const errMsg = error?.message || 'Unknown execution error';
    await DynamicWorkerSpawnManager.markFailed(heartbeatInput, errMsg).catch(() => undefined);
    const retryLimit = Math.max(0, Number(process.env.RUNTIME_TASK_CRASH_RETRIES || 1));
    const retryCount = Number((pickedTask.payload as any)?.retryCount || 0);

    if (retryCount < retryLimit) {
      const retryTask = await QueueAbstractionLayer.enqueue({
        runId: state.runId,
        projectId: state.projectId,
        chainId: state.threadId,
        pipelineId,
        stageId: pickedTask.stageId,
        agentSlug: pickedTask.agentSlug,
        payload: {
          ...((pickedTask.payload as Record<string, any>) || {}),
          retryCount: retryCount + 1,
          retryOfTaskId: pickedTask.taskId,
          retryReason: errMsg,
        },
      });
      await emitEvent({
        type: 'task.queued',
        runId: state.runId,
        projectId: state.projectId,
        chainId: state.threadId,
        actor: { type: 'system', id: 'dispatch-queue' },
        payload: {
          taskId: retryTask.taskId,
          stageId: retryTask.stageId,
          agentSlug: retryTask.agentSlug,
          retryCount: retryCount + 1,
          queueDepth: await QueueAbstractionLayer.depth(state.projectId, retryTask.agentSlug),
        },
      });
      const retryLease = await QueueAbstractionLayer.dequeue({
        projectId: state.projectId,
        agentSlug: retryTask.agentSlug,
        consumerId: `dispatcher-retry:${state.runId}`,
        environmentId: String((state as any).environmentId || '').trim() || undefined,
      });
      if (retryLease) {
        const retryPicked = retryLease.task;
        await QueueAbstractionLayer.ack(retryLease.leaseId);
        await emitEvent({
          type: 'task.dispatched',
          runId: state.runId,
          projectId: state.projectId,
          chainId: state.threadId,
          actor: { type: 'system', id: 'dispatch-queue' },
          payload: {
            taskId: retryPicked.taskId,
            stageId: retryPicked.stageId,
            agentSlug: retryPicked.agentSlug,
            retryCount: retryCount + 1,
            queuedForMs: Math.max(0, Date.now() - retryPicked.enqueuedAt),
            queueDepthAfterPickup: await QueueAbstractionLayer.depth(state.projectId, retryPicked.agentSlug),
          },
        });
        const retryWorkerLease = await DynamicWorkerSpawnManager.ensureWorker({
          runId: state.runId,
          projectId: state.projectId,
          tenantId: String((state as any).tenantId || '').trim() || undefined,
          workspaceId: String((state as any).workspaceId || '').trim() || undefined,
          environmentId: String((state as any).environmentId || '').trim() || undefined,
          chainId: state.threadId,
          agentSlug: retryPicked.agentSlug,
          taskId: retryPicked.taskId,
          stageId: retryPicked.stageId,
          pipelineId: retryPicked.pipelineId,
        });
        runContext = await buildRunContext(retryWorkerLease.worker.workerId);
        result = await runInConfiguredMode();
      } else {
        stopHeartbeat();
        throw error;
      }
    } else {
      stopHeartbeat();
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
            status: 'recovered',
            source: 'system',
            recoveryCategory: 'execution_error',
            message: `Stage failed: ${errMsg}`,
          }),
        ],
      };
    }
  }

  // Enforce AGENTS.md response contract with a single auto-reprompt recovery.
  let contractValidation = validateAgentResponseContract(result.content);
  result.content = contractValidation.normalizedText;
  if (!contractValidation.ok) {
    const validationErrors = contractValidation.errors;
    await emitEvent({
      type: 'agent.failed',
      runId: state.runId,
      projectId: state.projectId,
      chainId: state.threadId,
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
      result = await runWithStageTimeout(
        executor.run(repromptContext as any),
        stageTimeoutMs,
        `${nextStage.id}:${runContext.agent.slug}:reprompt`,
      );
    } catch (error: any) {
      stopHeartbeat();
      const errMsg = error?.message || 'Unknown execution error';
      await DynamicWorkerSpawnManager.markFailed(heartbeatInput, errMsg).catch(() => undefined);
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
            status: 'recovered',
            source: 'system',
            recoveryCategory: 'execution_error',
            message: `Reprompt failed: ${errMsg}`,
          }),
        ],
      };
    }

    contractValidation = validateAgentResponseContract(result.content);
    result.content = contractValidation.normalizedText;
    if (!contractValidation.ok) {
      result.content = buildContractRecoveryMessage(
        state,
        runContext,
        pipelineId,
        nextStage.id,
        contractValidation.errors,
        result.content
      );
      contractValidation = validateAgentResponseContract(result.content);
    }
  }

  await emitEvent({
    type: contractValidation.ok ? 'agent.completed' : 'agent.failed',
    runId: state.runId,
    projectId: state.projectId,
    chainId: state.threadId,
    actor: { type: 'agent', id: runContext.agent.slug, role: runContext.agent.slug },
    payload: {
      pipelineId,
      stageId: nextStage.id,
      stageTitle: String(nextStage.title || nextStage.name || nextStage.id || '').trim(),
      errors: contractValidation.ok ? [] : contractValidation.errors,
      outcome: contractValidation.ok ? 'success' : 'failed',
      summary: compactText(result.content, 260),
      workerId: workerLease.worker.workerId,
    },
  });
  stopHeartbeat();
  await DynamicWorkerSpawnManager.releaseToStandby(heartbeatInput);

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
          status: 'recovered',
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
    ticket: state.ticketId || 'AGSYS-UNKNOWN',
    runId: state.runId,
    chainId: state.threadId,
    projectId: state.projectId,
    workspacePath: state.workspacePath
  });

  await emitEvent({
    type: 'run.completed',
    runId: state.runId,
    projectId: state.projectId,
    chainId: state.threadId,
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
export async function executeUnifiedSwarmRun(initialState: Partial<PilotState>) {
  const thread = initialState.threadId || 'default';
  const threadConfig = { configurable: { thread_id: thread, threadId: thread } };
  const finalState = await pilotGraph.invoke(initialState, threadConfig);
  return finalState;
}

/**
 * Resumes an interrupted run.
 */
export async function resumeUnifiedSwarmRun(threadId: string, decision: any) {
  const threadConfig = { configurable: { thread_id: threadId, threadId } };
  // Use Command({ resume: decision }) to pass value back to interrupt()
  const finalState = await pilotGraph.invoke(new Command({ resume: decision }), threadConfig);
  return finalState;
}
