"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProjectRuntimeManifestValidator_1 = require("../ProjectRuntimeManifestValidator");
function baseManifest() {
    return {
        manifestVersion: '1.0',
        project: { id: 'p', name: 'p', rootPath: '/tmp/p' },
        agents: [
            {
                id: 'pm-orchestrator',
                callsign: 'PM',
                file: 'docs/agents/pm-orchestrator.md',
                capabilities: ['filesystem'],
                guardrails: [],
                defaultSkills: [],
            },
        ],
        skills: [],
        pipelines: [
            {
                id: 'unified-task-intake',
                source: 'docs/pipelines/unified-task-intake.md',
                default: true,
                stages: [
                    {
                        id: 'intake-1',
                        role: 'pm-orchestrator',
                        requiredGates: ['git-preflight'],
                        outputs: [],
                    },
                ],
                transitions: [],
                selectionRules: [{ keywords: ['intake'], scoreWeight: 1 }],
            },
        ],
        policies: {
            gates: [
                {
                    id: 'git-preflight',
                    type: 'pre-stage',
                    rule: 'require token',
                    severity: 'hard',
                    failureStatus: 'blocked',
                },
            ],
        },
    };
}
describe('ProjectRuntimeManifestValidator negative coverage', () => {
    it('flags unknown role and unknown gate in stage', () => {
        const manifest = baseManifest();
        manifest.pipelines[0].stages[0] = {
            id: 'intake-1',
            role: 'ghost-role',
            requiredGates: ['unknown-gate'],
            outputs: [],
        };
        const issues = (0, ProjectRuntimeManifestValidator_1.validateProjectRuntimeManifest)(manifest);
        expect(issues.some((i) => i.code === 'unknown_stage_role')).toBe(true);
        expect(issues.some((i) => i.code === 'unknown_required_gate')).toBe(true);
    });
    it('flags transition stage references that do not exist', () => {
        const manifest = baseManifest();
        manifest.pipelines[0].transitions = [{ from: 'missing-a', to: 'missing-b' }];
        const issues = (0, ProjectRuntimeManifestValidator_1.validateProjectRuntimeManifest)(manifest);
        expect(issues.some((i) => i.code === 'transition_unknown_from')).toBe(true);
        expect(issues.some((i) => i.code === 'transition_unknown_to')).toBe(true);
    });
    it('flags duplicate ids across core entities', () => {
        const manifest = baseManifest();
        manifest.agents.push({ ...manifest.agents[0] });
        manifest.policies.gates.push({ ...manifest.policies.gates[0] });
        const issues = (0, ProjectRuntimeManifestValidator_1.validateProjectRuntimeManifest)(manifest);
        expect(issues.filter((i) => i.code === 'duplicate_id').length).toBeGreaterThanOrEqual(2);
    });
    it('flags missing required top-level sections', () => {
        const manifest = baseManifest();
        manifest.agents = [];
        manifest.pipelines = [];
        const issues = (0, ProjectRuntimeManifestValidator_1.validateProjectRuntimeManifest)(manifest);
        expect(issues.some((i) => i.code === 'missing_agents')).toBe(true);
        expect(issues.some((i) => i.code === 'missing_pipelines')).toBe(true);
    });
});
