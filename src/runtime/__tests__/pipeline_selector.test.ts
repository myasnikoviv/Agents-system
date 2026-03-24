import { describe, expect, it } from '@jest/globals';
import { selectPipelineFromManifest, selectPipelineFromMessage } from '../PipelineSelector';
import { ProjectRuntimeManifest } from '../ProjectRuntimeManifest';

describe('PipelineSelector', () => {
  it('defaults to unified-task-intake when no strong signal is present', () => {
    const selected = selectPipelineFromMessage('Please help me think this through.');
    expect(selected.selectedPipeline).toBe('unified-task-intake');
    expect(selected.confidence).toBe('low');
  });

  it('routes wrong-branch recovery requests to git-conflict-recovery pipeline', () => {
    const selected = selectPipelineFromMessage(
      'We are on wrong branch with worktree mismatch; need recovery now',
    );
    expect(selected.selectedPipeline).toBe('git-conflict-recovery');
    expect(['high', 'medium']).toContain(selected.confidence);
  });

  it('routes strategy tuning requests to strategy-tuning pipeline', () => {
    const selected = selectPipelineFromMessage(
      'Run backtest and tune wave logic for better false positive control',
    );
    expect(selected.selectedPipeline).toBe('strategy-tuning');
    expect(['high', 'medium']).toContain(selected.confidence);
  });

  it('selects pipeline from manifest selection rules', () => {
    const manifest: ProjectRuntimeManifest = {
      manifestVersion: '1.0',
      project: { id: 'x', name: 'x', rootPath: '/tmp/x' },
      agents: [],
      skills: [],
      pipelines: [
        {
          id: 'unified-task-intake',
          source: 'docs/pipelines/unified-task-intake.md',
          fallback: true,
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

    const selected = selectPipelineFromManifest('Need to fix critical error in runtime', manifest);
    expect(selected.selectedPipeline).toBe('bug-fix');
    expect(['high', 'medium']).toContain(selected.confidence);
  });

  it('falls back to manifest fallback pipeline when no rule matches', () => {
    const manifest: ProjectRuntimeManifest = {
      manifestVersion: '1.0',
      project: { id: 'x', name: 'x', rootPath: '/tmp/x' },
      agents: [],
      skills: [],
      pipelines: [
        {
          id: 'unified-task-intake',
          source: 'docs/pipelines/unified-task-intake.md',
          fallback: true,
          stages: [{ id: 'intake-1', role: 'pm-orchestrator', requiredGates: [], outputs: [] }],
          transitions: [],
          selectionRules: [{ keywords: ['intake'], scoreWeight: 1 }],
        },
      ],
      policies: { gates: [] },
    };

    const selected = selectPipelineFromManifest('Just a random question', manifest);
    expect(selected.selectedPipeline).toBe('unified-task-intake');
    expect(selected.confidence).toBe('low');
  });
});
