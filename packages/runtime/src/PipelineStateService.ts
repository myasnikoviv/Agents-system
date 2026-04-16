import fs from 'fs/promises';
import path from 'path';

export interface PipelineStateCard {
  pipeline: string;
  mode: string;
  currentStage: string;
  completedStages: string[];
  nextStage: string;
  currentOwner: string;
  nextOwner: string;
  ticket: string;
  thread: string;
  lastUpdated: string;
  blockingGates: string;
  evidenceLinks: string;
  activeBranch: string;
  worktreePath: string;
  preflightToken: string;
  editorSource: string;
}

const STATE_DIR = path.resolve(process.cwd(), 'docs/process/pm/pipeline-state');

function sanitizeFileName(v: string): string {
  return v.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function cardPath(ticket: string, threadId: string): string {
  const name = ticket && ticket.trim().length > 0 ? ticket : `thread-${threadId}`;
  return path.join(STATE_DIR, `${sanitizeFileName(name)}.md`);
}

function render(card: PipelineStateCard): string {
  return [
    `# Pipeline State: ${card.ticket || card.thread}`,
    `- Pipeline: ${card.pipeline}`,
    `- Mode: ${card.mode}`,
    `- Current Stage: ${card.currentStage}`,
    `- Completed Stages: ${card.completedStages.join(', ')}`,
    `- Next Stage: ${card.nextStage}`,
    `- Current Owner: ${card.currentOwner}`,
    `- Next Owner: ${card.nextOwner}`,
    `- Ticket: ${card.ticket}`,
    `- Thread: ${card.thread}`,
    `- Last Updated: ${card.lastUpdated}`,
    `- Blocking Gates: ${card.blockingGates}`,
    `- Evidence Links: ${card.evidenceLinks}`,
    `- Active Branch: ${card.activeBranch}`,
    `- Worktree Path: ${card.worktreePath}`,
    `- Preflight Token: ${card.preflightToken}`,
    `- Editor Source: ${card.editorSource}`,
    '',
  ].join('\n');
}

export async function readPipelineStateCard(ticket: string, threadId: string): Promise<PipelineStateCard | null> {
  const p = cardPath(ticket, threadId);
  try {
    const text = await fs.readFile(p, 'utf-8');
    const get = (key: string): string => {
      const line = text
        .split('\n')
        .find((l) => l.startsWith(`- ${key}:`));
      return line ? line.replace(`- ${key}:`, '').trim() : '';
    };

    return {
      pipeline: get('Pipeline'),
      mode: get('Mode'),
      currentStage: get('Current Stage'),
      completedStages: get('Completed Stages')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      nextStage: get('Next Stage'),
      currentOwner: get('Current Owner'),
      nextOwner: get('Next Owner'),
      ticket: get('Ticket'),
      thread: get('Thread'),
      lastUpdated: get('Last Updated'),
      blockingGates: get('Blocking Gates'),
      evidenceLinks: get('Evidence Links'),
      activeBranch: get('Active Branch'),
      worktreePath: get('Worktree Path'),
      preflightToken: get('Preflight Token'),
      editorSource: get('Editor Source'),
    };
  } catch {
    return null;
  }
}

export async function upsertPipelineStateCard(input: {
  pipeline: string;
  mode: string;
  stage: string;
  completedStages: string[];
  nextStage: string;
  currentOwner: string;
  nextOwner: string;
  ticket: string;
  threadId: string;
  blockingGates?: string;
  evidenceLinks?: string;
  activeBranch?: string;
  worktreePath?: string;
  preflightToken?: string;
  editorSource?: string;
}) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  const p = cardPath(input.ticket, input.threadId);

  const card: PipelineStateCard = {
    pipeline: input.pipeline,
    mode: input.mode,
    currentStage: input.stage,
    completedStages: input.completedStages,
    nextStage: input.nextStage,
    currentOwner: input.currentOwner,
    nextOwner: input.nextOwner,
    ticket: input.ticket,
    thread: input.threadId,
    lastUpdated: new Date().toISOString(),
    blockingGates: input.blockingGates || 'none',
    evidenceLinks: input.evidenceLinks || '-',
    activeBranch: input.activeBranch || '',
    worktreePath: input.worktreePath || '',
    preflightToken: input.preflightToken || '',
    editorSource: input.editorSource || '',
  };

  await fs.writeFile(p, render(card), 'utf-8');
  return p;
}

export async function validateResumeConsistency(input: {
  ticket: string;
  threadId: string;
  expectedStage?: string;
  expectedNextStage?: string;
  expectedBranch?: string;
  expectedWorktreePath?: string;
  expectedPreflightToken?: string;
  expectedEditorSource?: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const card = await readPipelineStateCard(input.ticket, input.threadId);
  if (!card) {
    return { ok: true };
  }

  if (input.expectedStage) {
    if (card.currentStage && card.currentStage !== input.expectedStage) {
      return {
        ok: false,
        reason: `state_mismatch:card_stage=${card.currentStage},expected_stage=${input.expectedStage}`,
      };
    }
  }

  if (input.expectedNextStage) {
    if (card.nextStage && card.nextStage !== input.expectedNextStage) {
      return {
        ok: false,
        reason: `state_mismatch:card_next=${card.nextStage},expected_next=${input.expectedNextStage}`,
      };
    }
  }

  if (input.expectedBranch) {
    if (!card.activeBranch || card.activeBranch === input.expectedBranch) {
      // ok
    } else {
      return {
        ok: false,
        reason: `state_mismatch:card_branch=${card.activeBranch},expected_branch=${input.expectedBranch}`,
      };
    }
  }

  if (input.expectedWorktreePath) {
    if (!card.worktreePath || card.worktreePath === input.expectedWorktreePath) {
      // ok
    } else {
      return {
        ok: false,
        reason: `state_mismatch:card_worktree=${card.worktreePath},expected_worktree=${input.expectedWorktreePath}`,
      };
    }
  }

  if (input.expectedPreflightToken) {
    if (!card.preflightToken || card.preflightToken === input.expectedPreflightToken) {
      // ok
    } else {
      return {
        ok: false,
        reason: `state_mismatch:card_preflight=${card.preflightToken},expected_preflight=${input.expectedPreflightToken}`,
      };
    }
  }

  if (input.expectedEditorSource) {
    if (!card.editorSource || card.editorSource === input.expectedEditorSource) {
      // ok
    } else {
      return {
        ok: false,
        reason: `state_mismatch:card_editor=${card.editorSource},expected_editor=${input.expectedEditorSource}`,
      };
    }
  }

  return { ok: true };
}
