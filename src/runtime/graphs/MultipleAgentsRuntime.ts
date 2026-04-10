import { AgentExecutor } from '../AgentExecutor';
import { RunContextAssembler } from '../context/RunContext';
import { emitEvent } from '../events/EventBus';
import { AgentRegistry } from '../registries/AgentRegistry';
import { PipelineRegistry } from '../registries/PipelineRegistry';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';
import { DynamicWorkerSpawnManager } from '../workers/DynamicWorkerSpawnManager';
import { executeRunContextInSubprocess } from '../workers/WorkerProcessExecutor';
import type { PilotState } from './UnifiedSwarmGraph';

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
  const stageTimeoutMs = Math.max(1000, Number(process.env.RUNTIME_STAGE_TIMEOUT_MS || 60000));
  const stageParallelism = Math.max(1, Number(process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM || 2));
  const enforcedSkills = Array.isArray((initialState as any)?.enforcement?.skills)
    ? (initialState as any).enforcement.skills
        .map((x: any) => String(x || '').trim())
        .filter((x: string) => x.length > 0)
    : [];

  if (enforcedPipeline && selectedPipeline && enforcedPipeline !== selectedPipeline) {
    throw new Error(`multiple_agents_enforced_pipeline_mismatch:${selectedPipeline}->${enforcedPipeline}`);
  }

  const pipeline = PipelineRegistry.getPipeline(pipelineId);
  if (!pipeline || !Array.isArray(pipeline.stages) || pipeline.stages.length === 0) {
    throw new Error(`multiple_agents_pipeline_missing:${pipelineId}`);
  }

  const userInput = buildUserInput(initialState);
  const executor = new AgentExecutor();

  if (enforcedSkills.length > 0) {
    const stageAgents = Array.from(new Set(pipeline.stages.map((s) => asString(s.agent || s.role, 'system-core'))))
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
    },
  }).catch(() => undefined);

  const nextMessages = [...(initialState.messages || [])];
  const artifactLogs = [...(initialState.artifactLogs || [])];
  const runStage = async (stage: any, historySnapshot: any[]) => {
    const agentSlug = asString(stage.agent || stage.role, 'system-core');
    const agent = AgentRegistry.getAgent(agentSlug);
    if (!agent) {
      throw new Error(`multiple_agents_agent_missing:${agentSlug}`);
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

    const lease = await DynamicWorkerSpawnManager.ensureWorker({
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
      const subprocess = await executeRunContextInSubprocess({ runContext, timeoutMs: stageTimeoutMs });
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
      return {
        message: { role: 'assistant', content: toAssistantMessage(stage.id, agent.title || agent.slug, resultText) },
        artifact: formatStageResult(stage.id, agent.title || agent.slug, resultText),
      };
    } catch (error: any) {
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

  for (let i = 0; i < pipeline.stages.length; i += stageParallelism) {
    const chunk = pipeline.stages.slice(i, i + stageParallelism);
    const historySnapshot = [...nextMessages];
    const results = await Promise.all(chunk.map((stage) => runStage(stage, historySnapshot)));
    for (const result of results) {
      nextMessages.push(result.message);
      artifactLogs.push(result.artifact);
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
