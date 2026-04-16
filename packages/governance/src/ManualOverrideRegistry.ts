import fs from 'fs';
import path from 'path';
import { resolveRuntimePath } from '@system/shared';
import type { GovernanceEngineContext, GovernancePhase, GovernanceRule } from './GovernanceEngineTypes';

export interface GovernanceManualOverride {
  id: string;
  projectId: string;
  scope: 'global' | 'phase' | 'rule';
  phase?: GovernancePhase;
  ruleId?: GovernanceRule['id'];
  ticketId?: string;
  actorId: string;
  reason: string;
  createdAt: string;
  expiresAt?: string;
  enabled: boolean;
}

function overrideFile(workspacePath?: string): string {
  const root = workspacePath || process.cwd();
  const dir = path.dirname(resolveRuntimePath(root, 'governanceRuleRegistryFile'));
  return path.join(dir, 'manual-overrides.jsonl');
}

function parseLine(line: string): GovernanceManualOverride | null {
  try {
    const row = JSON.parse(line) as GovernanceManualOverride;
    if (!row?.id || !row?.projectId) return null;
    if (!row?.scope) return null;
    return row;
  } catch {
    return null;
  }
}

export function listManualOverrides(workspacePath?: string): GovernanceManualOverride[] {
  const file = overrideFile(workspacePath);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(parseLine)
    .filter((v): v is GovernanceManualOverride => Boolean(v));
}

export function addManualOverride(
  input: Omit<GovernanceManualOverride, 'id' | 'createdAt' | 'enabled'> & { enabled?: boolean },
  workspacePath?: string,
): GovernanceManualOverride {
  const row: GovernanceManualOverride = {
    id: `gov-override-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    enabled: input.enabled !== false,
    ...input,
  };
  const file = overrideFile(workspacePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, 'utf-8');
  return row;
}

function isExpired(row: GovernanceManualOverride): boolean {
  if (!row.expiresAt) return false;
  const ts = Date.parse(row.expiresAt);
  if (!Number.isFinite(ts)) return false;
  return ts <= Date.now();
}

export function resolveManualOverride(input: {
  context: GovernanceEngineContext;
  phase: GovernancePhase;
  ruleId: GovernanceRule['id'];
}): GovernanceManualOverride | null {
  const rows = listManualOverrides(input.context.workspacePath);
  return (
    rows.find((row) => {
      if (!row.enabled || isExpired(row)) return false;
      if (row.projectId !== input.context.projectId) return false;
      if (row.ticketId && row.ticketId !== input.context.ticketId) return false;
      if (row.scope === 'global') return true;
      if (row.scope === 'phase') return row.phase === input.phase;
      if (row.scope === 'rule') return row.ruleId === input.ruleId;
      return false;
    }) || null
  );
}

