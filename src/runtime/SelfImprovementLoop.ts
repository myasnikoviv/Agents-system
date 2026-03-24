import fs from 'fs/promises';
import path from 'path';

export interface SelfImprovementInput {
  ticketId: string;
  runId: string;
  pipelineId: string;
  status: string;
  logs: string[];
}

export interface SelfImprovementOutput {
  qualityScore: number;
  findings: string[];
  improvementActions: string[];
  retrospectivePath: string;
  instructionProposalPath: string;
}

function scoreFromLogs(status: string, logs: string[]): { score: number; findings: string[] } {
  const findings: string[] = [];
  let score = status === 'done' || status === 'completed' ? 85 : 55;
  const lowered = logs.join('\n').toLowerCase();
  if (lowered.includes('fallback')) {
    score -= 15;
    findings.push('fallback_used');
  }
  if (lowered.includes('blocked')) {
    score -= 20;
    findings.push('blocked_stage_detected');
  }
  if (lowered.includes('quota')) {
    score -= 10;
    findings.push('quota_risk_detected');
  }
  if (lowered.includes('[stage:git]') && !lowered.includes('cleanup')) {
    score -= 5;
    findings.push('git_cleanup_evidence_missing');
  }
  return { score: Math.max(0, Math.min(100, score)), findings };
}

function actionsFromFindings(findings: string[]): string[] {
  const actions: string[] = [];
  if (findings.includes('fallback_used')) {
    actions.push('Add provider resiliency decision tree before stage execution.');
  }
  if (findings.includes('blocked_stage_detected')) {
    actions.push('Create blocker ticket automatically and enforce 3-attempt autonomous recovery.');
  }
  if (findings.includes('quota_risk_detected')) {
    actions.push('Add quota precheck + provider fallback preflight gate.');
  }
  if (findings.includes('git_cleanup_evidence_missing')) {
    actions.push('Enforce post-sprint git closure verification gate in pipeline termination.');
  }
  if (actions.length === 0) {
    actions.push('No critical findings. Keep current pipeline contracts and monitor drift.');
  }
  return actions;
}

export async function runSelfImprovementLoop(input: SelfImprovementInput): Promise<SelfImprovementOutput> {
  const retroDir = path.resolve(process.cwd(), 'docs/process/retrospectives');
  const instrDir = path.resolve(process.cwd(), 'docs/process/instructions');
  await fs.mkdir(retroDir, { recursive: true });
  await fs.mkdir(instrDir, { recursive: true });

  const { score, findings } = scoreFromLogs(input.status, input.logs);
  const actions = actionsFromFindings(findings);

  const retrospectivePath = path.join(retroDir, `${input.ticketId}-siw-auto.md`);
  const instructionProposalPath = path.join(instrDir, `${input.ticketId}-siw-improvement.md`);

  const retroBody = [
    `# SIW Retrospective ${input.ticketId}`,
    `- Run: ${input.runId}`,
    `- Pipeline: ${input.pipelineId}`,
    `- Status: ${input.status}`,
    `- Quality Score: ${score}/100`,
    '',
    '## Findings',
    ...(findings.length > 0 ? findings.map((f) => `- ${f}`) : ['- no_critical_findings']),
    '',
    '## Proposed Actions',
    ...actions.map((a) => `- ${a}`),
    '',
  ].join('\n');
  await fs.writeFile(retrospectivePath, retroBody, 'utf-8');

  const proposalBody = [
    `# Instruction Evolution Proposal ${input.ticketId}`,
    `- Source Run: ${input.runId}`,
    `- Pipeline: ${input.pipelineId}`,
    '',
    '## Required Changes',
    ...actions.map((a) => `- ${a}`),
    '',
    '## Human Override',
    '- Requires explicit approve/reject before hard rollout.',
    '',
  ].join('\n');
  await fs.writeFile(instructionProposalPath, proposalBody, 'utf-8');

  return {
    qualityScore: score,
    findings,
    improvementActions: actions,
    retrospectivePath,
    instructionProposalPath,
  };
}

