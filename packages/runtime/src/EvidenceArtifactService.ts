import fs from 'fs/promises';
import path from 'path';

export interface ChatExecutionArtifactInput {
  ticketId: string;
  runId: string;
  pipelineId: string;
  stage: string;
  status: string;
  logs: string[];
  gitContext?: {
    branch?: string;
    worktreePath?: string;
    preflightToken?: string | null;
  };
}

export async function writeChatExecutionArtifact(input: ChatExecutionArtifactInput): Promise<string> {
  const dir = path.resolve(process.cwd(), 'docs/process/runs');
  await fs.mkdir(dir, { recursive: true });
  const safeTicket = (input.ticketId || 'chat').replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = path.join(dir, `${safeTicket}-chat-exec.md`);
  const body = [
    `# Chat Execution Artifact ${safeTicket}`,
    `- Run: ${input.runId}`,
    `- Pipeline: ${input.pipelineId}`,
    `- Stage: ${input.stage}`,
    `- Status: ${input.status}`,
    `- Branch: ${input.gitContext?.branch || '-'}`,
    `- Worktree: ${input.gitContext?.worktreePath || '-'}`,
    `- Preflight: ${input.gitContext?.preflightToken || '-'}`,
    '',
    '## Logs',
    ...(input.logs.length > 0 ? input.logs.map((l) => `- ${l}`) : ['- no_logs']),
    '',
  ].join('\n');
  await fs.writeFile(file, body, 'utf-8');
  return file;
}

