import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface GitExecutionContext {
  branch: string;
  worktreePath: string;
}

export interface MutationPolicyCheck {
  ok: boolean;
  reason?: string;
}

export function getGitExecutionContext(repoRoot: string = process.cwd()): GitExecutionContext {
  let branch = '';
  try {
    branch = execSync('git branch --show-current', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
  } catch {
    branch = '';
  }
  return { branch, worktreePath: path.resolve(repoRoot) };
}

export function validateMainBranchMutationPolicy(input: {
  context: GitExecutionContext;
  hasMutatingAction: boolean;
}): MutationPolicyCheck {
  if (!input.hasMutatingAction) {
    return { ok: true };
  }
  if (input.context.branch === 'main' || input.context.branch === 'master') {
    return { ok: false, reason: `main_branch_mutation_forbidden:${input.context.branch}` };
  }
  return { ok: true };
}

function parseEnvFile(filePath: string): Record<string, string> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const out: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1');
    out[key] = value;
  }
  return out;
}

export function validatePreflightTokenPolicy(input: {
  context: GitExecutionContext;
  hasMutatingAction: boolean;
  preflightDir?: string;
}): MutationPolicyCheck {
  if (!input.hasMutatingAction) {
    return { ok: true };
  }

  const preflightDir =
    input.preflightDir || path.resolve(process.cwd(), 'docs/process/git/preflights');
  if (!fs.existsSync(preflightDir)) {
    return { ok: false, reason: 'preflight_missing:directory_not_found' };
  }

  const files = fs
    .readdirSync(preflightDir)
    .filter((f) => f.endsWith('.env'))
    .map((f) => path.join(preflightDir, f));

  let matched: Record<string, string> | null = null;
  for (const tokenFile of files) {
    const token = parseEnvFile(tokenFile);
    if (
      token.BRANCH === input.context.branch &&
      path.resolve(token.WORKTREE || '') === path.resolve(input.context.worktreePath)
    ) {
      matched = token;
      break;
    }
  }

  if (!matched) {
    return { ok: false, reason: 'preflight_missing:token_not_found' };
  }
  if (matched.STATUS !== 'APPROVED') {
    return { ok: false, reason: `preflight_invalid:status_${matched.STATUS || 'unset'}` };
  }
  if (matched.EXECUTION_APPROVED !== 'YES') {
    return {
      ok: false,
      reason: `preflight_invalid:execution_${matched.EXECUTION_APPROVED || 'unset'}`,
    };
  }
  if (!matched.APPROVED_BY || !matched.APPROVED_AT) {
    return { ok: false, reason: 'preflight_invalid:approval_metadata' };
  }

  return { ok: true };
}

export function resolveMatchingPreflightTokenPath(input: {
  context: GitExecutionContext;
  preflightDir?: string;
}): string {
  const preflightDir =
    input.preflightDir || path.resolve(process.cwd(), 'docs/process/git/preflights');
  if (!fs.existsSync(preflightDir)) {
    return '';
  }
  const files = fs
    .readdirSync(preflightDir)
    .filter((f) => f.endsWith('.env'))
    .map((f) => path.join(preflightDir, f));

  for (const tokenFile of files) {
    const token = parseEnvFile(tokenFile);
    if (
      token.BRANCH === input.context.branch &&
      path.resolve(token.WORKTREE || '') === path.resolve(input.context.worktreePath)
    ) {
      return tokenFile;
    }
  }
  return '';
}
