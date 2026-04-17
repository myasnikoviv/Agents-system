"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PipelineSelector_1 = require("../PipelineSelector");
(0, globals_1.describe)('PipelineSelector', () => {
    (0, globals_1.it)('defaults to unified-task-intake when no strong signal is present', () => {
        const selected = (0, PipelineSelector_1.selectPipelineFromMessage)('Please help me think this through.');
        (0, globals_1.expect)(selected.selectedPipeline).toBe('unified-task-intake');
        (0, globals_1.expect)(selected.confidence).toBe('low');
    });
    (0, globals_1.it)('routes wrong-branch recovery requests to git-conflict-recovery pipeline', () => {
        const selected = (0, PipelineSelector_1.selectPipelineFromMessage)('We are on wrong branch with worktree mismatch; need recovery now');
        (0, globals_1.expect)(selected.selectedPipeline).toBe('git-conflict-recovery');
        (0, globals_1.expect)(['high', 'medium']).toContain(selected.confidence);
    });
    (0, globals_1.it)('routes strategy tuning requests to strategy-tuning pipeline', () => {
        const selected = (0, PipelineSelector_1.selectPipelineFromMessage)('Run backtest and tune wave logic for better false positive control');
        (0, globals_1.expect)(selected.selectedPipeline).toBe('strategy-tuning');
        (0, globals_1.expect)(['high', 'medium']).toContain(selected.confidence);
    });
    (0, globals_1.it)('selects pipeline from manifest selection rules', () => {
        const manifest = {
            manifestVersion: '1.0',
            project: { id: 'x', name: 'x', rootPath: '/tmp/x' },
            agents: [],
            skills: [],
            pipelines: [
                {
                    id: 'unified-task-intake',
                    source: 'docs/pipelines/unified-task-intake.md',
                    default: true,
                    stages: [{ id: 'intake-1', role: 'pm-orchestrator', requiredGates: [], outputs: [] }],
                    transitions: [],
                    selectionRules: [{ keywords: ['intake'], scoreWeight: 1 }],
                },
                {
                    id: 'bug-fix',
                    source: 'docs/pipelines/bug-fix.md',
                    stages: [{ id: 'qa-1', role: 'tdd-qa', requiredGates: [], outputs: [] }],
                    transitions: [],
                    selectionRules: [{ keywords: ['bug', 'error', 'fix'], scoreWeight: 2 }],
                },
            ],
            policies: { gates: [] },
        };
        const selected = (0, PipelineSelector_1.selectPipelineFromManifest)('Need to fix critical error in runtime', manifest);
        (0, globals_1.expect)(selected.selectedPipeline).toBe('bug-fix');
        (0, globals_1.expect)(['high', 'medium']).toContain(selected.confidence);
    });
    (0, globals_1.it)('falls back to manifest default pipeline when no rule matches', () => {
        const manifest = {
            manifestVersion: '1.0',
            project: { id: 'x', name: 'x', rootPath: '/tmp/x' },
            agents: [],
            skills: [],
            pipelines: [
                {
                    id: 'unified-task-intake',
                    source: 'docs/pipelines/unified-task-intake.md',
                    default: true,
                    stages: [{ id: 'intake-1', role: 'pm-orchestrator', requiredGates: [], outputs: [] }],
                    transitions: [],
                    selectionRules: [{ keywords: ['intake'], scoreWeight: 1 }],
                },
            ],
            policies: { gates: [] },
        };
        const selected = (0, PipelineSelector_1.selectPipelineFromManifest)('Just a random question', manifest);
        (0, globals_1.expect)(selected.selectedPipeline).toBe('unified-task-intake');
        (0, globals_1.expect)(selected.confidence).toBe('low');
    });
});
