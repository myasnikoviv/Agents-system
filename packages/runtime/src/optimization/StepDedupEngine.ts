import fs from 'fs';
import path from 'path';

interface StepDedupPolicy {
  enabled?: boolean;
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function loadPolicy(workspacePath: string): StepDedupPolicy {
  return readJson<StepDedupPolicy>(
    path.resolve(workspacePath, 'docs/runtime/adaptive/chain-optimization-policy.json'),
    { enabled: true },
  );
}

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildStepDedupKey(input: {
  workspacePath: string;
  pipelineId: string;
  agentSlug: string;
  userInput: string;
  stage: any;
}): string | null {
  const policy = loadPolicy(input.workspacePath);
  if (policy.enabled === false) return null;
  const agentSlug = normalize(input.agentSlug);
  const userInput = normalize(input.userInput);
  const stageSignature = normalize(
    input.stage?.dedupKey ||
      input.stage?.prompt ||
      input.stage?.title ||
      input.stage?.name ||
      input.stage?.id ||
      '',
  );
  if (!agentSlug || !stageSignature) return null;
  return `${normalize(input.pipelineId)}::${agentSlug}::${stageSignature}::${userInput}`;
}
