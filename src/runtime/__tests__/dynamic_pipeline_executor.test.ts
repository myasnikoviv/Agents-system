import { executeDynamicPipeline } from '../DynamicPipelineExecutor';
import { ProjectRuntimeManifest } from '../ProjectRuntimeManifest';

function buildManifest(): ProjectRuntimeManifest {
  return {
    manifestVersion: '1.0',
    project: { id: 'p1', name: 'p1', rootPath: '/tmp/p1' },
    agents: [
      { id: 'pm-orchestrator', callsign: 'PM', file: 'docs/agents/pm.md', capabilities: [], guardrails: [], defaultSkills: [] },
      { id: 'developer', callsign: 'Dev', file: 'docs/agents/dev.md', capabilities: [], guardrails: [], defaultSkills: [] },
      { id: 'documentation-owner', callsign: 'Docs', file: 'docs/agents/docs.md', capabilities: [], guardrails: [], defaultSkills: [] },
    ],
    skills: [],
    pipelines: [
      {
        id: 'new-feature',
        source: 'docs/pipelines/new-feature.md',
        fallback: true,
        stages: [
          { id: 'intake-1', role: 'pm-orchestrator', requiredGates: ['git-preflight'], outputs: [] },
          { id: 'developer-2', role: 'developer', requiredGates: ['git-preflight'], outputs: [] },
          { id: 'docs-3', role: 'documentation-owner', requiredGates: ['git-preflight'], outputs: [] },
        ],
        transitions: [
          { from: 'intake-1', to: 'developer-2' },
          { from: 'developer-2', to: 'docs-3' },
        ],
        selectionRules: [{ keywords: ['new', 'feature'], scoreWeight: 1 }],
      },
    ],
    policies: {
      gates: [
        { id: 'git-preflight', type: 'pre-stage', rule: 'preflight', severity: 'hard', failureStatus: 'blocked' },
        { id: 'postflight-validation', type: 'pre-pipeline-close', rule: 'postflight', severity: 'hard', failureStatus: 'rework' },
      ],
    },
  };
}

describe('DynamicPipelineExecutor', () => {
  it('executes manifest pipeline in transition order and completes', async () => {
    const manifest = buildManifest();
    const executed: string[] = [];

    const result = await executeDynamicPipeline(
      manifest,
      'new-feature',
      { ticketId: 'T-1', threadId: 'th-1', input: 'run' },
      {
        evaluateGate: async () => ({ ok: true }),
        runStage: async (stage) => {
          executed.push(stage.id);
          return { status: 'success', log: `ok:${stage.id}` };
        },
      },
    );

    expect(result.status).toBe('completed');
    expect(executed).toEqual(['intake-1', 'developer-2', 'docs-3']);
    expect(result.completedStages).toEqual(['intake-1', 'developer-2', 'docs-3']);
  });

  it('blocks when required pre-stage gate fails', async () => {
    const manifest = buildManifest();

    const result = await executeDynamicPipeline(
      manifest,
      'new-feature',
      { ticketId: 'T-2', threadId: 'th-2', input: 'run' },
      {
        evaluateGate: async (_gate, stage) => {
          if (stage?.id === 'developer-2') {
            return { ok: false, reason: 'missing_preflight' };
          }
          return { ok: true };
        },
        runStage: async (stage) => ({ status: 'success', log: `ok:${stage.id}` }),
      },
    );

    expect(result.status).toBe('blocked');
    expect(result.blockedStage).toBe('developer-2');
    expect(result.blockedByGate).toBe('git-preflight');
  });

  it('blocks on pre-pipeline-close gate when postflight evidence fails', async () => {
    const manifest = buildManifest();

    const result = await executeDynamicPipeline(
      manifest,
      'new-feature',
      { ticketId: 'T-3', threadId: 'th-3', input: 'run' },
      {
        evaluateGate: async (gate, stage) => {
          if (gate.id === 'postflight-validation' && stage === null) {
            return { ok: false, reason: 'missing_postflight_evidence' };
          }
          return { ok: true };
        },
        runStage: async (stage) => ({ status: 'success', log: `ok:${stage.id}` }),
      },
    );

    expect(result.status).toBe('blocked');
    expect(result.blockedByGate).toBe('postflight-validation');
  });
});
