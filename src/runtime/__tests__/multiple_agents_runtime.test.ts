import { executeMultipleAgentsRun } from '../graphs/MultipleAgentsRuntime';
import { AgentExecutor } from '../AgentExecutor';
import { AgentRegistry } from '../registries/AgentRegistry';
import { PipelineRegistry } from '../registries/PipelineRegistry';
import { ProjectDispatchQueue } from '../queue/ProjectDispatchQueue';

jest.mock('../events/EventBus', () => ({
  emitEvent: jest.fn(async () => undefined),
}));

jest.mock('../graphs/UnifiedSwarmGraph', () => ({
  executeUnifiedSwarmRun: jest.fn(async () => ({ status: 'should-not-be-called' })),
}));

jest.mock('../context/RunContext', () => ({
  RunContextAssembler: {
    assemble: jest.fn(async (_agent: any, _pipeline: any, _stageId: string, _task: string, memory: any) => ({
      runId: memory?.runId || 'run-1',
      agent: { slug: 'pm-orchestrator' },
    })),
  },
}));

jest.mock('../workers/WorkerProcessExecutor', () => ({
  executeRunContextInSubprocess: jest.fn(async () => ({ content: 'ok' })),
}));

jest.mock('../workers/DynamicWorkerSpawnManager', () => ({
  DynamicWorkerSpawnManager: {
    ensureWorker: jest.fn(async (input: any) => ({
      worker: { workerId: `worker-${input.agentSlug}`, agentSlug: input.agentSlug },
      spawned: true,
    })),
    releaseToStandby: jest.fn(async () => undefined),
    markFailed: jest.fn(async () => undefined),
  },
}));

describe('MultipleAgentsRuntime', () => {
  beforeEach(() => {
    AgentRegistry.clear();
    PipelineRegistry.clear();
    ProjectDispatchQueue.clear();

    AgentRegistry.register({
      slug: 'pm-orchestrator',
      name: 'PM',
      title: 'PM',
      callsign: 'PMO',
      mission: 'Orchestrate pipeline execution safely.',
      description: 'PM orchestration test profile.',
      instructions: 'Coordinate stages and keep strict handoff order.',
      owns: [],
      guardrails: ['no-destructive-git'],
      skills: ['pipeline-selection'],
      tools: [],
      fullInstructions: '',
      sourcePath: 'test',
    });
    AgentRegistry.register({
      slug: 'developer',
      name: 'Developer',
      title: 'Developer',
      callsign: 'DEVA',
      mission: 'Implement runtime features with deterministic behavior.',
      description: 'Developer test profile.',
      instructions: 'Implement assigned stage output without side effects.',
      owns: [],
      guardrails: ['no-destructive-git'],
      skills: ['test-fixing'],
      tools: [],
      fullInstructions: '',
      sourcePath: 'test',
    });

    PipelineRegistry.register({
      id: 'unified-task-intake',
      name: 'Unified',
      title: 'Unified',
      slug: 'unified-task-intake',
      description: 'test',
      sourcePath: 'test',
      stages: [
        {
          id: 'stage-1',
          name: 'stage-1',
          title: 'Stage 1',
          role: 'pm-orchestrator',
          agent: 'pm-orchestrator',
          description: '',
          instructions: '',
          nextAllowedRoles: ['developer'],
          completionCriteria: '',
        },
        {
          id: 'stage-2',
          name: 'stage-2',
          title: 'Stage 2',
          role: 'developer',
          agent: 'developer',
          description: '',
          instructions: '',
          nextAllowedRoles: [],
          completionCriteria: '',
        },
      ],
    });
  });

  it('runs dedicated multiple_agents engine without unified swarm fallback', async () => {
    const { executeUnifiedSwarmRun } = require('../graphs/UnifiedSwarmGraph');
    const { executeRunContextInSubprocess } = require('../workers/WorkerProcessExecutor');
    const { RunContextAssembler } = require('../context/RunContext');
    const enqueueSpy = jest.spyOn(ProjectDispatchQueue, 'enqueue');
    const pickupSpy = jest.spyOn(ProjectDispatchQueue, 'pickupForWorker');

    process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM = '2';
    const result = await executeMultipleAgentsRun({
      runId: 'run-1',
      projectId: 'proj-a',
      threadId: 'thread-1',
      selected_pipeline: 'unified-task-intake',
      messages: [{ role: 'user', content: 'hello' }],
      executionOptions: { mode: 'multiple_agents' },
    } as any);

    expect(result.status).toBe('pipeline_completed');
    expect(enqueueSpy).toHaveBeenCalledTimes(2);
    expect(pickupSpy).toHaveBeenCalledTimes(2);
    expect(executeRunContextInSubprocess).toHaveBeenCalledTimes(2);
    const historyLengths = (RunContextAssembler.assemble as jest.Mock).mock.calls.map((call: any[]) => call?.[4]?.history?.length);
    expect(historyLengths).toEqual([1, 1]);
    expect(executeUnifiedSwarmRun).not.toHaveBeenCalled();
    delete process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM;
  });

  it('shows factual overlap for parallel stage execution', async () => {
    const { executeRunContextInSubprocess } = require('../workers/WorkerProcessExecutor');
    let inFlight = 0;
    let maxInFlight = 0;
    (executeRunContextInSubprocess as jest.Mock).mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 40));
      inFlight -= 1;
      return { content: 'ok' };
    });

    process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM = '2';
    await executeMultipleAgentsRun({
      runId: 'run-parallel',
      projectId: 'proj-a',
      threadId: 'thread-parallel',
      selected_pipeline: 'unified-task-intake',
      messages: [{ role: 'user', content: 'parallel check' }],
      executionOptions: { mode: 'multiple_agents' },
    } as any);
    delete process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM;

    expect(maxInFlight).toBeGreaterThanOrEqual(2);
  });

  it('fails when selected pipeline conflicts with enforced pipeline', async () => {
    await expect(
      executeMultipleAgentsRun({
        runId: 'run-mismatch',
        projectId: 'proj-a',
        threadId: 'thread-mismatch',
        selected_pipeline: 'bug-fix',
        enforcement: { pipeline: 'unified-task-intake', skills: [] },
        messages: [{ role: 'user', content: 'hello' }],
        executionOptions: { mode: 'multiple_agents' },
      } as any),
    ).rejects.toThrow('multiple_agents_enforced_pipeline_mismatch');
  });

  it('fails when enforced skills are not covered by pipeline agents', async () => {
    await expect(
      executeMultipleAgentsRun({
        runId: 'run-skills',
        projectId: 'proj-a',
        threadId: 'thread-skills',
        selected_pipeline: 'unified-task-intake',
        enforcement: { pipeline: 'unified-task-intake', skills: ['non-existent-skill'] },
        messages: [{ role: 'user', content: 'hello' }],
        executionOptions: { mode: 'multiple_agents' },
      } as any),
    ).rejects.toThrow('multiple_agents_enforced_skills_missing');
  });

  it('keeps queue/dispatch/lifecycle path working without LLM fallback call', async () => {
    const runSpy = jest.spyOn(AgentExecutor.prototype as any, 'run');
    process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM = '2';
    const result = await executeMultipleAgentsRun({
      runId: 'run-no-llm',
      projectId: 'proj-a',
      threadId: 'thread-no-llm',
      selected_pipeline: 'unified-task-intake',
      messages: [{ role: 'user', content: 'deterministic only' }],
      executionOptions: { mode: 'multiple_agents' },
    } as any);
    delete process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM;

    expect(result.status).toBe('pipeline_completed');
    expect(runSpy).not.toHaveBeenCalled();
    runSpy.mockRestore();
  });
});
