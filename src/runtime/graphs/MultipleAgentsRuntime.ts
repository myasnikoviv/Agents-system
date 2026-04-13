import { AgentExecutor } from '../AgentExecutor';
import { RunContextAssembler } from '../context/RunContext';
import { emitEvent } from '../events/EventBus';
import { AgentRegistry } from '../registries/AgentRegistry';
import { PipelineRegistry } from '../registries/PipelineRegistry';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';
import { QueueAbstractionLayer } from '../queue/QueueAbstractionLayer';
import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { executeRunContextInSubprocess } from '../workers/WorkerProcessExecutor';
import { pruneExecutionChain, writeChainPruningReport } from '../optimization/ChainPruningEngine';
import { buildStepDedupKey } from '../optimization/StepDedupEngine';
import { buildLlmResponseCacheKey, getCachedLlmResponse, setCachedLlmResponse } from '../optimization/LlmResponseCache';
import { buildSemanticCacheBucket, getSemanticCacheHit, setSemanticCacheEntry } from '../optimization/SemanticCache';
import type { PilotState } from './UnifiedSwarmGraph';
import type { PipelineDefinition, PipelineStage } from '../registries/PipelineRegistry';
import { resolveMeetingSpec, type MeetingSpec } from '../meeting/MeetingSpec';
import { MeetingLoopRuntime } from '../meeting/MeetingLoopRuntime';
import type { MeetingArtifact } from '../meeting/ArtifactValidationEngine';

function asString(value: unknown, defaultValue: string): string {
  const normalized = String(value || '').trim();
  return normalized || defaultValue;
}

function buildUserInput(initialState: Partial<PilotState>): string {
  const latest = [...(initialState.messages || [])].reverse().find((m) => m.role === 'user');
  return String(latest?.content || '').trim();
}

function formatStageResult(stageId: string, agentTitle: string, content: string): string {
  return `[stage:${stageId}] [role:${agentTitle}] [status:completed] ${String(content || '').slice(0, 3000)}`;
}

function toAssistantMessage(stageId: string, agentTitle: string, content: string): string {
  const body = String(content || '').trim() || 'No output returned.';
  return `Stage ${stageId} (${agentTitle}) completed.\n\n${body}`;
}

function buildSyntheticMeetingPipeline(spec: MeetingSpec): PipelineDefinition {
  const stages: PipelineStage[] = spec.participants.map((participant, index) => ({
    id: participant,
    name: `${participant} Meeting Turn`,
    title: `${participant} Meeting Turn`,
    role: participant,
    agent: participant,
    description: `Meeting turn stage for ${participant}`,
    instructions: `Contribute as ${participant} according to meeting spec rules.`,
    nextAllowedRoles: spec.participants.filter((slug) => slug !== participant),
    completionCriteria: 'Turn response produced',
  }));
  return {
    id: 'meeting',
    slug: 'meeting',
    name: 'Declarative Meeting Runtime',
    title: 'Declarative Meeting Runtime',
    description: `Synthetic runtime pipeline generated from meeting spec (${spec.mode})`,
    stages: stages.map((stage, idx) => ({
      ...stage,
      nextAllowedRoles: idx < stages.length - 1 ? [stages[idx + 1].agent] : [],
    })),
    sourcePath: 'docs/runtime/meetings/meeting-spec.yaml',
  };
}

export async function executeMultipleAgentsRun(initialState: Partial<PilotState>): Promise<any> {
  const runId = asString(initialState.runId, `run-${Date.now()}`);
  const projectId = asString(initialState.projectId, 'agent_system');
  const chainId = asString(initialState.threadId, `thread-${Date.now()}`);
  const enforcedPipeline = asString((initialState as any)?.enforcement?.pipeline, '');
  const selectedPipeline = asString(initialState.selected_pipeline, '');
  const pipelineId = enforcedPipeline || selectedPipeline || 'unified-task-intake';
  const workspacePath = asString(initialState.workspacePath, process.cwd());
  const environmentId = asString((initialState as any).environmentId, '');
  const tenantId = asString((initialState as any).tenantId, '');
  const workspaceId = asString((initialState as any).workspaceId, '');
  const stageTimeoutMs = Math.max(60000, Number(process.env.RUNTIME_STAGE_TIMEOUT_MS || 0));
  const stageParallelism = Math.max(1, Number(process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM || 2));
  const enforcedSkills = Array.isArray((initialState as any)?.enforcement?.skills)
    ? (initialState as any).enforcement.skills
        .map((x: any) => String(x || '').trim())
        .filter((x: string) => x.length > 0)
    : [];

  if (enforcedPipeline && selectedPipeline && enforcedPipeline !== selectedPipeline) {
    throw new Error(`multiple_agents_enforced_pipeline_mismatch:${selectedPipeline}->${enforcedPipeline}`);
  }

  const meetingSpec = pipelineId === 'meeting' ? resolveMeetingSpec(workspacePath) : null;
  const pipeline = meetingSpec ? buildSyntheticMeetingPipeline(meetingSpec) : PipelineRegistry.getPipeline(pipelineId);
  if (!pipeline || !Array.isArray(pipeline.stages) || pipeline.stages.length === 0) {
    throw new Error(`multiple_agents_pipeline_missing:${pipelineId}`);
  }
  const qualityDegradationMode = String(process.env.RUNTIME_QUALITY_DEGRADATION || 'none');
  const maxStagesOverride = qualityDegradationMode === 'budget_constrained'
    ? Math.max(1, Number(process.env.RUNTIME_DEGRADED_MAX_STAGES || 6))
    : undefined;
  const pruning = pruneExecutionChain({ workspacePath, stages: pipeline.stages, ...(maxStagesOverride ? { maxStagesOverride } : {}) });
  const effectiveStages = pruning.stages;
  const pruningReportPath = writeChainPruningReport(workspacePath, runId, {
    pipelineId,
    beforeCount: pruning.beforeCount,
    afterCount: pruning.afterCount,
    prunedCount: pruning.prunedCount,
    estimatedLlmCallsBefore: pruning.estimatedLlmCallsBefore,
    estimatedLlmCallsAfter: pruning.estimatedLlmCallsAfter,
    measurableImprovementPct: pruning.measurableImprovementPct,
    reasons: pruning.reasons,
  });

  const userInput = buildUserInput(initialState);
  const executor = new AgentExecutor();
  const cacheEnabled = process.env.NODE_ENV !== 'test';

  if (enforcedSkills.length > 0) {
    const stageAgents = Array.from(new Set(effectiveStages.map((s) => asString(s.agent || s.role, 'system-core'))))
      .map((slug) => AgentRegistry.getAgent(slug))
      .filter(Boolean) as Array<{ skills?: string[]; slug: string }>;
    const missingSkills = enforcedSkills.filter((skill) =>
      !stageAgents.some((agent) => Array.isArray(agent.skills) && agent.skills.includes(skill)),
    );
    if (missingSkills.length > 0) {
      throw new Error(`multiple_agents_enforced_skills_missing:${missingSkills.join(',')}`);
    }
  }

  await emitEvent({
    type: 'system.thought',
    runId,
    projectId,
    chainId,
    actor: { type: 'system', id: 'multiple-agents-runtime' },
    payload: {
      message: `Dedicated multiple_agents engine selected. Pipeline=${pipelineId}`,
      engine: 'multiple-agents-runtime-dedicated',
      chainPruning: {
        beforeCount: pruning.beforeCount,
        afterCount: pruning.afterCount,
        prunedCount: pruning.prunedCount,
        measurableImprovementPct: pruning.measurableImprovementPct,
        reportPath: pruningReportPath,
        qualityDegradationMode,
      },
    },
  }).catch(() => undefined);

  const nextMessages = [...(initialState.messages || [])];
  const artifactLogs = [...(initialState.artifactLogs || [])];
  const dedupResultCache = new Map<string, { resultText: string; agentTitle: string; sourceStageId: string }>();
  const runStage = async (stage: any, historySnapshot: any[]) => {
    const agentSlug = asString(stage.agent || stage.role, 'system-core');
    const agent = AgentRegistry.getAgent(agentSlug);
    if (!agent) {
      throw new Error(`multiple_agents_agent_missing:${agentSlug}`);
    }
    const llmCacheKey = buildLlmResponseCacheKey({
      pipelineId,
      stage,
      agentSlug,
      userInput,
    });
    const semanticBucket = buildSemanticCacheBucket({
      pipelineId,
      agentSlug,
      stage,
    });
    const cachedResponse = cacheEnabled
      ? getCachedLlmResponse({
          workspacePath,
          key: llmCacheKey,
          stage,
        })
      : { hit: false as const };
    if (cachedResponse.hit) {
      const resultText = `[cache-hit] ${String(cachedResponse.value || '')}`;
      await emitEvent({
        type: 'agent.completed',
        runId,
        projectId,
        chainId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          stageId: stage.id,
          stageTitle: stage.title || stage.name || stage.id,
          outcome: 'cache_hit',
          cacheType: 'llm_response',
          summary: resultText.slice(0, 600),
          agentSlug,
        },
      }).catch(() => undefined);
      return {
        message: { role: 'assistant', content: toAssistantMessage(stage.id, agent.title || agent.slug, resultText) },
        artifact: formatStageResult(stage.id, agent.title || agent.slug, resultText),
      };
    }
    const semanticHit = cacheEnabled
      ? getSemanticCacheHit({
          workspacePath,
          bucket: semanticBucket,
          query: userInput,
        })
      : { hit: false as const, threshold: 0, score: 0, response: '' };
    if (semanticHit.hit) {
      const resultText = `[semantic-cache-hit score=${Number(semanticHit.score || 0).toFixed(2)} threshold=${Number(semanticHit.threshold).toFixed(2)}] ${String(semanticHit.response || '')}`;
      await emitEvent({
        type: 'agent.completed',
        runId,
        projectId,
        chainId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          stageId: stage.id,
          stageTitle: stage.title || stage.name || stage.id,
          outcome: 'semantic_cache_hit',
          cacheType: 'semantic',
          similarityScore: semanticHit.score,
          similarityThreshold: semanticHit.threshold,
          summary: resultText.slice(0, 600),
          agentSlug,
        },
      }).catch(() => undefined);
      return {
        message: { role: 'assistant', content: toAssistantMessage(stage.id, agent.title || agent.slug, resultText) },
        artifact: formatStageResult(stage.id, agent.title || agent.slug, resultText),
      };
    }
    const dedupKey = buildStepDedupKey({
      workspacePath,
      pipelineId,
      agentSlug,
      userInput,
      stage,
    });
    if (dedupKey && dedupResultCache.has(dedupKey)) {
      const cached = dedupResultCache.get(dedupKey)!;
      const resultText = `[reused-from:${cached.sourceStageId}] ${cached.resultText}`;
      await emitEvent({
        type: 'agent.completed',
        runId,
        projectId,
        chainId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          stageId: stage.id,
          stageTitle: stage.title || stage.name || stage.id,
          outcome: 'reused',
          dedupApplied: true,
          dedupKey,
          sourceStageId: cached.sourceStageId,
          summary: resultText.slice(0, 600),
          agentSlug,
        },
      }).catch(() => undefined);
      return {
        message: { role: 'assistant', content: toAssistantMessage(stage.id, agent.title || agent.slug, resultText) },
        artifact: formatStageResult(stage.id, agent.title || agent.slug, resultText),
      };
    }

    const queueTask = await ProjectDispatchQueue.enqueueAsync({
      runId,
      projectId,
      chainId,
      pipelineId,
      stageId: stage.id,
      agentSlug,
      payload: {
        source: 'multiple_agents_runtime',
        stageTitle: stage.title || stage.name || stage.id,
        ...(environmentId ? { environmentId } : {}),
      },
    });

    await emitEvent({
      type: 'task.queued',
      runId,
      projectId,
      chainId,
      actor: { type: 'system', id: 'dispatch-queue' },
      payload: {
        taskId: queueTask.taskId,
        stageId: queueTask.stageId,
        agentSlug: queueTask.agentSlug,
        queueDepth: await ProjectDispatchQueue.depthAsync(projectId, queueTask.agentSlug),
      },
    }).catch(() => undefined);

    let lease: Awaited<ReturnType<typeof DynamicWorkerSpawnManager.ensureWorker>> | null = null;
    let ensureError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        lease = await DynamicWorkerSpawnManager.ensureWorker({
          runId,
          projectId,
          ...(tenantId ? { tenantId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
          ...(environmentId ? { environmentId } : {}),
          chainId,
          agentSlug,
          taskId: queueTask.taskId,
          stageId: queueTask.stageId,
          pipelineId: queueTask.pipelineId,
          retryCount: Number((queueTask.payload as any)?.retryCount || 0),
        });
        ensureError = null;
        break;
      } catch (error: any) {
        ensureError = error instanceof Error ? error : new Error(String(error || 'ensure_worker_failed'));
        if (!String(ensureError.message || '').includes('worker_lock_busy') || attempt === 3) {
          break;
        }
        // Short backoff to allow in-flight lock holder to release.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
      }
    }
    if (!lease) {
      throw ensureError || new Error(`multiple_agents_ensure_worker_failed:${agentSlug}`);
    }

    const pickedTask = await ProjectDispatchQueue.pickupForWorkerAsync(
      projectId,
      agentSlug,
      lease.worker.workerId,
      environmentId ? { environmentId } : undefined,
    );
    if (!pickedTask) {
      throw new Error(`multiple_agents_pickup_failed:${projectId}:${agentSlug}:${stage.id}`);
    }
    const taskEnvironmentId = String((pickedTask.payload as any)?.environmentId || '').trim();
    if (environmentId && taskEnvironmentId && taskEnvironmentId !== environmentId) {
      throw new Error(`multiple_agents_environment_mismatch:${environmentId}:${taskEnvironmentId}`);
    }

    await emitEvent({
      type: 'task.dispatched',
      runId,
      projectId,
      chainId,
      actor: { type: 'system', id: 'dispatch-queue' },
      payload: {
        taskId: pickedTask.taskId,
        stageId: pickedTask.stageId,
        agentSlug: pickedTask.agentSlug,
        workerId: lease.worker.workerId,
        dispatchMode: (pickedTask.payload as any)?.dispatchMode || 'worker_pull',
      },
    }).catch(() => undefined);

    const runContext = await RunContextAssembler.assemble(
      agent,
      pipeline,
      stage.id,
      userInput,
      {
        runId,
        threadId: chainId,
        history: historySnapshot,
        workerId: lease.worker.workerId,
        ...(tenantId ? { tenantId } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(environmentId ? { environmentId } : {}),
      },
      { preferredLanguage: initialState.preferredLanguage as any },
      { projectId, workspacePath },
    );

    await emitEvent({
      type: 'agent.started',
      runId,
      projectId,
      chainId,
      actor: { type: 'agent', id: agent.slug, role: agent.slug },
      payload: {
        stageId: stage.id,
        stageTitle: stage.title || stage.name || stage.id,
        agentSlug,
        workerId: lease.worker.workerId,
      },
    }).catch(() => undefined);

    try {
      const subprocess = await executeRunContextInSubprocess({
        runContext,
        // Keep subprocess timeout bounded to force deterministic fallback path.
        timeoutMs: Math.min(stageTimeoutMs, 60000),
      });
      const content = String(subprocess?.content || '').trim();
      const resultText = content || (await executor.run(runContext)).content || '';

      await emitEvent({
        type: 'agent.completed',
        runId,
        projectId,
        chainId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          stageId: stage.id,
          stageTitle: stage.title || stage.name || stage.id,
          outcome: 'completed',
          summary: resultText.slice(0, 600),
          agentSlug,
          workerId: lease.worker.workerId,
        },
      }).catch(() => undefined);

      await DynamicWorkerSpawnManager.releaseToStandby({
        runId,
        projectId,
        ...(tenantId ? { tenantId } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(environmentId ? { environmentId } : {}),
        chainId,
        agentSlug,
      }).catch(() => undefined);
      if (dedupKey) {
        dedupResultCache.set(dedupKey, {
          resultText,
          agentTitle: agent.title || agent.slug,
          sourceStageId: String(stage.id || ''),
        });
      }
      if (cacheEnabled) {
        setCachedLlmResponse({
          workspacePath,
          key: llmCacheKey,
          value: resultText,
        });
        setSemanticCacheEntry({
          workspacePath,
          bucket: semanticBucket,
          prompt: userInput,
          response: resultText,
        });
      }
      return {
        message: { role: 'assistant', content: toAssistantMessage(stage.id, agent.title || agent.slug, resultText) },
        artifact: formatStageResult(stage.id, agent.title || agent.slug, resultText),
      };
    } catch (error: any) {
      const errMsg = String(error?.message || 'execution_failed');
      if (errMsg.includes('worker_subprocess_timeout')) {
        const directTimeoutMs = Math.max(10000, Number(process.env.RUNTIME_DIRECT_FALLBACK_TIMEOUT_MS || 25000));
        const fallback = await Promise.race([
          executor.run(runContext),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), directTimeoutMs)),
        ]);
        const fallbackText =
          fallback && (fallback as any).ok
            ? String((fallback as any).content || '').trim()
            : `[degraded_fallback] Stage ${String(stage.id || '')} timed out in subprocess and direct fallback (${directTimeoutMs}ms).`;
        await emitEvent({
          type: 'agent.completed',
          runId,
          projectId,
          chainId,
          actor: { type: 'agent', id: agent.slug, role: agent.slug },
          payload: {
            stageId: stage.id,
            stageTitle: stage.title || stage.name || stage.id,
            outcome: 'completed',
            summary: fallbackText.slice(0, 600),
            agentSlug,
            workerId: lease.worker.workerId,
            fallback: 'bounded_direct_after_subprocess_timeout',
          },
        }).catch(() => undefined);
        await DynamicWorkerSpawnManager.releaseToStandby({
          runId,
          projectId,
          ...(tenantId ? { tenantId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
          ...(environmentId ? { environmentId } : {}),
          chainId,
          agentSlug,
        }).catch(() => undefined);
        return {
          message: { role: 'assistant', content: toAssistantMessage(stage.id, agent.title || agent.slug, fallbackText) },
          artifact: formatStageResult(stage.id, agent.title || agent.slug, fallbackText),
        };
      }
      const retryLimit = Math.max(0, Number(process.env.RUNTIME_TASK_CRASH_RETRIES || 0));
      const retryCount = Number((pickedTask.payload as any)?.retryCount || 0);
      if (retryCount >= retryLimit) {
        await QueueAbstractionLayer.toDlq({
          task: pickedTask,
          reason: String(error?.message || 'execution_failed'),
          retriesExhausted: retryLimit,
          actorId: 'runtime-system',
        }).catch(() => undefined);
      }
      await DynamicWorkerSpawnManager.markFailed(
        {
          runId,
          projectId,
          ...(tenantId ? { tenantId } : {}),
          ...(workspaceId ? { workspaceId } : {}),
          ...(environmentId ? { environmentId } : {}),
          chainId,
          agentSlug,
        },
        String(error?.message || 'execution_failed'),
      ).catch(() => undefined);

      await emitEvent({
        type: 'agent.failed',
        runId,
        projectId,
        chainId,
        actor: { type: 'agent', id: agent.slug, role: agent.slug },
        payload: {
          stageId: stage.id,
          stageTitle: stage.title || stage.name || stage.id,
          reason: String(error?.message || 'execution_failed'),
          agentSlug,
          workerId: lease.worker.workerId,
        },
      }).catch(() => undefined);

      throw error;
    }
  };

  if (meetingSpec) {
    const meetingRuntime = new MeetingLoopRuntime(meetingSpec, {
      maxAttempts: Math.max(1, Number(process.env.RUNTIME_MEETING_MAX_ATTEMPTS || 2)),
    });
    const stageByParticipant = new Map(effectiveStages.map((stage) => [String(stage.agent || stage.role || stage.id), stage]));
    const collectedTurnOutputs: Array<{ participant: string; round: number; content: string }> = [];
    const meetingResult = await meetingRuntime.run(
      async (turn) => {
        const stage = stageByParticipant.get(turn.participant);
        if (!stage) {
          throw new Error(`meeting_participant_stage_missing:${turn.participant}`);
        }
        const result = await runStage(stage, [...nextMessages]);
        nextMessages.push(result.message);
        artifactLogs.push(result.artifact);
        collectedTurnOutputs.push({
          participant: turn.participant,
          round: turn.round,
          content: String(result.message.content || ''),
        });
        return result.message.content;
      },
      async ({ roundState, attempt }) => {
        const summary = collectedTurnOutputs
          .map((row) => `r${row.round}:${row.participant}:${row.content.slice(0, 200)}`)
          .join('\n');
        const artifacts: MeetingArtifact[] = meetingSpec.artifacts.map((name) => ({
          name,
          payload: {
            attempt,
            roundState,
            summary,
          },
          producedBy: meetingSpec.moderator,
        }));
        return artifacts;
      },
    );
    if (meetingResult.status !== 'completed') {
      throw new Error(`multiple_agents_meeting_failed:${meetingResult.failureReason || 'unknown_failure'}`);
    }
    artifactLogs.push(
      `[meeting-loop] status=completed;attempt=${meetingResult.attempt};rounds=${meetingResult.roundState.currentRound};artifacts=${meetingResult.artifacts
        .map((a) => a.name)
        .join(',')}`,
    );
  } else {
    for (let i = 0; i < effectiveStages.length; i += stageParallelism) {
      const chunk = effectiveStages.slice(i, i + stageParallelism);
      const historySnapshot = [...nextMessages];
      const results = await Promise.all(chunk.map((stage) => runStage(stage, historySnapshot)));
      for (const result of results) {
        nextMessages.push(result.message);
        artifactLogs.push(result.artifact);
      }
    }
  }

  return {
    ...initialState,
    runId,
    projectId,
    threadId: chainId,
    selected_pipeline: pipelineId,
    status: 'pipeline_completed',
    messages: nextMessages,
    artifactLogs,
  };
}
