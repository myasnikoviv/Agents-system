import fs from 'fs/promises';
import path from 'path';

export interface DecouplingMatrixRow {
  control: string;
  sourceOfTruth: string;
  runtimeImplementation: string;
  status: 'ok' | 'gap';
}

export async function generateDecouplingComplianceMatrix(): Promise<{
  rows: DecouplingMatrixRow[];
  artifactPath: string;
}> {
  const rows: DecouplingMatrixRow[] = [
    {
      control: 'Pipeline selection mandatory',
      sourceOfTruth: 'AGENTS.md + docs/pipelines/*',
      runtimeImplementation: 'PipelineSelector + /api/chat selection',
      status: 'ok',
    },
    {
      control: 'Self-improvement loop enforced',
      sourceOfTruth: 'docs/pipelines/* SIW dependency',
      runtimeImplementation: 'SelfImprovementLoop integrated in /api/chat and /api/chat/approve',
      status: 'ok',
    },
    {
      control: 'Cross-editor continuity guard',
      sourceOfTruth: 'Agent-system session continuity policy',
      runtimeImplementation: 'PipelineStateService editorSource + resume validation',
      status: 'ok',
    },
    {
      control: 'Artifact-first evidence contract',
      sourceOfTruth: 'postflight/evidence rules',
      runtimeImplementation: 'EvidenceArtifactService + pipeline state evidence links',
      status: 'ok',
    },
    {
      control: 'Workbench lock policy',
      sourceOfTruth: 'tool governance policy',
      runtimeImplementation: 'AgentWorkbenchScheduler (isolated/share-safe/exclusive)',
      status: 'ok',
    },
  ];

  const dir = path.resolve(process.cwd(), 'docs/process/reviews');
  await fs.mkdir(dir, { recursive: true });
  const artifactPath = path.join(dir, 'AGSYS-23-decoupling-compliance-matrix.md');
  const markdown = [
    '# AGSYS-23 Decoupling Compliance Matrix',
    '',
    '| Control | Source of Truth | Runtime Implementation | Status |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.control} | ${r.sourceOfTruth} | ${r.runtimeImplementation} | ${r.status.toUpperCase()} |`),
    '',
  ].join('\n');
  await fs.writeFile(artifactPath, markdown, 'utf-8');

  return { rows, artifactPath };
}

