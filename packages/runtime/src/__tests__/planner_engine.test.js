"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentRegistry_1 = require("../registries/AgentRegistry");
const PipelineRegistry_1 = require("../registries/PipelineRegistry");
const PlannerEngine_1 = require("../planner/PlannerEngine");
describe('PlannerEngine', () => {
    beforeEach(() => {
        AgentRegistry_1.AgentRegistry.clear();
        PipelineRegistry_1.PipelineRegistry.clear();
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
        PipelineRegistry_1.PipelineRegistry.register({
            id: 'bug-fix',
            name: 'Bug Fix',
            title: 'Bug Fix',
            slug: 'bug-fix',
            description: 'test',
            sourcePath: 'test',
            stages: [
                {
                    id: 'intake',
                    name: 'intake',
                    title: 'Intake',
                    role: 'pm-orchestrator',
                    agent: 'pm-orchestrator',
                    description: '',
                    instructions: '',
                    nextAllowedRoles: [],
                    completionCriteria: '',
                },
            ],
        });
    });
    it('returns structured planner JSON with pipeline/agents/skills/stages', () => {
        const decision = (0, PlannerEngine_1.buildPlannerDecision)({
            runId: 'run-1',
            projectId: 'proj-a',
            ticketId: 'AGSYS-100',
            message: 'Please fix this runtime bug quickly',
        });
        expect(decision.source).toBe('deterministic-planner');
        expect(decision.pipeline).toBe('bug-fix');
        expect(Array.isArray(decision.agents)).toBe(true);
        expect(Array.isArray(decision.skills)).toBe(true);
        expect(Array.isArray(decision.stages)).toBe(true);
    });
    it('adapts skills dynamically from message intent', () => {
        const docsDecision = (0, PlannerEngine_1.buildPlannerDecision)({
            runId: 'run-2',
            projectId: 'proj-a',
            ticketId: 'AGSYS-101',
            message: 'Please update README docs and documentation for this flow',
            requestedPipeline: 'new-feature',
        });
        const testDecision = (0, PlannerEngine_1.buildPlannerDecision)({
            runId: 'run-3',
            projectId: 'proj-a',
            ticketId: 'AGSYS-102',
            message: 'Need regression test coverage and CI assertions',
            requestedPipeline: 'new-feature',
        });
        expect(docsDecision.skills.join(',')).not.toBe(testDecision.skills.join(','));
        expect(docsDecision.skills.some((s) => s.includes('documentation-update'))).toBe(true);
        expect(testDecision.skills.some((s) => s.includes('test'))).toBe(true);
    });
});
