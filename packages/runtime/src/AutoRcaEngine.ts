import fs from 'fs/promises';
import path from 'path';

export interface AutoRcaResult {
  triggered: boolean;
  reason: string;
  artifactPath?: string;
  suggestedIssueName?: string;
}

export async function runAutoRca(input: {
  ticketId: string;
  pipelineId: string;
  qualityScore: number;
  logs: string[];
}): Promise<AutoRcaResult> {
  const hasFailureSignal = input.logs.some((l) => /fail|error|blocked|mismatch/i.test(l));
  const lowQuality = input.qualityScore < 75;
  if (!hasFailureSignal && !lowQuality) {
    return { triggered: false, reason: 'no_failure_signal' };
  }

  const dir = path.resolve(process.cwd(), 'docs/process/retrospectives');
  await fs.mkdir(dir, { recursive: true });
  const artifactPath = path.join(dir, `${input.ticketId}-auto-rca.md`);
  const suggestedIssueName = `Auto-RCA follow-up: ${input.ticketId}`;

  const body = [
    `# Auto-RCA: ${input.ticketId}`,
    '',
    `- Pipeline: ${input.pipelineId}`,
    `- Quality Score: ${input.qualityScore}`,
    `- Trigger: ${hasFailureSignal ? 'failure_signal' : 'quality_gate'}`,
    '',
    '## Observed Signals',
    ...input.logs.filter((l) => /fail|error|blocked|mismatch/i.test(l)).map((l) => `- ${l}`),
    '',
    '## Recommended Actions',
    '- Create follow-up improvement ticket.',
    '- Add/extend guard in pipeline or agent skill.',
    '- Add regression test for this failure mode.',
    '',
  ].join('\n');

  await fs.writeFile(artifactPath, body, 'utf-8');
  return { triggered: true, reason: hasFailureSignal ? 'failure_signal' : 'quality_gate', artifactPath, suggestedIssueName };
}
