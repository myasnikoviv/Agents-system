"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MultipleAgentsRuntime_1 = require("../graphs/MultipleAgentsRuntime");
const AgentExecutor_1 = require("../AgentExecutor");
const AgentRegistry_1 = require("../registries/AgentRegistry");
const PipelineRegistry_1 = require("../registries/PipelineRegistry");
const ProjectDispatchQueue_1 = require("../queue/ProjectDispatchQueue");
jest.mock('@system/events', () => ({
    emitEvent: jest.fn(async () => undefined),
}));
jest.mock('../graphs/UnifiedSwarmGraph', () => ({
    executeUnifiedSwarmRun: jest.fn(async () => ({ status: 'should-not-be-called' })),
}));
jest.mock('../context/RunContext', () => ({
    RunContextAssembler: {
        assemble: jest.fn(async (_agent, _pipeline, _stageId, _task, memory) => ({
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
        ensureWorker: jest.fn(async (input) => ({
            worker: { workerId: `worker-${input.agentSlug}`, agentSlug: input.agentSlug },
            spawned: true,
        })),
        releaseToStandby: jest.fn(async () => undefined),
        markFailed: jest.fn(async () => undefined),
    },
}));
describe('MultipleAgentsRuntime', () => {
    beforeEach(() => {
        AgentRegistry_1.AgentRegistry.clear();
        PipelineRegistry_1.PipelineRegistry.clear();
        ProjectDispatchQueue_1.ProjectDispatchQueue.clear();
        AgentRegistry_1.AgentRegistry.register({
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
        AgentRegistry_1.AgentRegistry.register({
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
        PipelineRegistry_1.PipelineRegistry.register({
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
    it('runs dedicated multiple_agents engine without unified swarm default', async () => {
        const { executeUnifiedSwarmRun } = require('../graphs/UnifiedSwarmGraph');
        const { executeRunContextInSubprocess } = require('../workers/WorkerProcessExecutor');
        const { RunContextAssembler } = require('../context/RunContext');
        const enqueueSpy = jest.spyOn(ProjectDispatchQueue_1.ProjectDispatchQueue, 'enqueueAsync');
        const pickupSpy = jest.spyOn(ProjectDispatchQueue_1.ProjectDispatchQueue, 'pickupForWorkerAsync');
        process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM = '2';
        const result = await (0, MultipleAgentsRuntime_1.executeMultipleAgentsRun)({
            runId: 'run-1',
            projectId: 'proj-a',
            threadId: 'thread-1',
            selected_pipeline: 'unified-task-intake',
            messages: [{ role: 'user', content: 'hello' }],
            executionOptions: { mode: 'multiple_agents' },
        });
        expect(result.status).toBe('pipeline_completed');
        expect(enqueueSpy).toHaveBeenCalledTimes(2);
        expect(pickupSpy).toHaveBeenCalledTimes(2);
        expect(executeRunContextInSubprocess).toHaveBeenCalledTimes(2);
        const historyLengths = RunContextAssembler.assemble.mock.calls.map((call) => call?.[4]?.history?.length);
        expect(historyLengths).toEqual([1, 1]);
        expect(executeUnifiedSwarmRun).not.toHaveBeenCalled();
        delete process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM;
    });
    it('shows factual overlap for parallel stage execution', async () => {
        const { executeRunContextInSubprocess } = require('../workers/WorkerProcessExecutor');
        let inFlight = 0;
        let maxInFlight = 0;
        executeRunContextInSubprocess.mockImplementation(async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 40));
            inFlight -= 1;
            return { content: 'ok' };
        });
        process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM = '2';
        await (0, MultipleAgentsRuntime_1.executeMultipleAgentsRun)({
            runId: 'run-parallel',
            projectId: 'proj-a',
            threadId: 'thread-parallel',
            selected_pipeline: 'unified-task-intake',
            messages: [{ role: 'user', content: 'parallel check' }],
            executionOptions: { mode: 'multiple_agents' },
        });
        delete process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM;
        expect(maxInFlight).toBeGreaterThanOrEqual(2);
    });
    it('fails when selected pipeline conflicts with enforced pipeline', async () => {
        await expect((0, MultipleAgentsRuntime_1.executeMultipleAgentsRun)({
            runId: 'run-mismatch',
            projectId: 'proj-a',
            threadId: 'thread-mismatch',
            selected_pipeline: 'bug-fix',
            enforcement: { pipeline: 'unified-task-intake', skills: [] },
            messages: [{ role: 'user', content: 'hello' }],
            executionOptions: { mode: 'multiple_agents' },
        })).rejects.toThrow('multiple_agents_enforced_pipeline_mismatch');
    });
    it('fails when enforced skills are not covered by pipeline agents', async () => {
        await expect((0, MultipleAgentsRuntime_1.executeMultipleAgentsRun)({
            runId: 'run-skills',
            projectId: 'proj-a',
            threadId: 'thread-skills',
            selected_pipeline: 'unified-task-intake',
            enforcement: { pipeline: 'unified-task-intake', skills: ['non-existent-skill'] },
            messages: [{ role: 'user', content: 'hello' }],
            executionOptions: { mode: 'multiple_agents' },
        })).rejects.toThrow('multiple_agents_enforced_skills_missing');
    });
    it('keeps queue/dispatch/lifecycle path working without LLM default call', async () => {
        const runSpy = jest.spyOn(AgentExecutor_1.AgentExecutor.prototype, 'run');
        process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM = '2';
        const result = await (0, MultipleAgentsRuntime_1.executeMultipleAgentsRun)({
            runId: 'run-no-llm',
            projectId: 'proj-a',
            threadId: 'thread-no-llm',
            selected_pipeline: 'unified-task-intake',
            messages: [{ role: 'user', content: 'deterministic only' }],
            executionOptions: { mode: 'multiple_agents' },
        });
        delete process.env.RUNTIME_MULTIPLE_AGENTS_PARALLELISM;
        expect(result.status).toBe('pipeline_completed');
        expect(runSpy).not.toHaveBeenCalled();
        runSpy.mockRestore();
    });
});
