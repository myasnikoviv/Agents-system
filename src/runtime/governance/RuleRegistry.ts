import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { GovernanceRule } from './GovernanceEngineTypes';
import { resolveRuntimePath } from '../RuntimePathResolver';

interface GovernanceRuleRegistryFile {
  rules?: GovernanceRule[];
}

export interface GovernanceRuleHistoryEntry {
  id: string;
  ruleId: string;
  action: 'create' | 'update' | 'disable';
  timestamp: string;
  actorId: string;
  before: GovernanceRule | null;
  after: GovernanceRule;
}

export class GovernanceRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GovernanceRegistryError';
  }
}

function normalizeRules(input: GovernanceRule[]): GovernanceRule[] {
  const seen = new Set<string>();
  const normalized: GovernanceRule[] = [];
  for (const rule of input) {
    if (!rule?.id || seen.has(rule.id)) {
      continue;
    }
    seen.add(rule.id);
    normalized.push(rule);
  }
  return normalized;
}

function readYamlRules(workspacePath?: string): GovernanceRule[] {
  const root = workspacePath || process.cwd();
  const filePath = resolveRuntimePath(root, 'governanceRuleRegistryFile');
  if (!fs.existsSync(filePath)) {
    throw new GovernanceRegistryError(`governance_rule_registry_missing:${filePath}`);
  }

  try {
    const raw = yaml.load(fs.readFileSync(filePath, 'utf-8')) as GovernanceRuleRegistryFile;
    if (!raw?.rules || !Array.isArray(raw.rules) || raw.rules.length === 0) {
      throw new GovernanceRegistryError(`governance_rule_registry_empty:${filePath}`);
    }
    const parsed = normalizeRules(raw.rules);
    if (parsed.length === 0) {
      throw new GovernanceRegistryError(`governance_rule_registry_invalid:${filePath}`);
    }
    return parsed.map((rule) => ({
      ...rule,
      disabled: rule.disabled === true,
      scope: rule.scope || { level: 'global' },
      metadata: {
        name: rule.metadata?.name || rule.id,
        description: rule.metadata?.description || '',
        version: rule.metadata?.version || '1.0.0',
        owner: rule.metadata?.owner || 'system',
        tags: Array.isArray(rule.metadata?.tags) ? rule.metadata?.tags : [],
        createdAt: rule.metadata?.createdAt || new Date().toISOString(),
        updatedAt: rule.metadata?.updatedAt || new Date().toISOString(),
      },
    }));
  } catch (error) {
    if (error instanceof GovernanceRegistryError) {
      throw error;
    }
    throw new GovernanceRegistryError(`governance_rule_registry_unreadable:${filePath}`);
  }
}

function catalogFile(workspacePath?: string): string {
  const root = workspacePath || process.cwd();
  return resolveRuntimePath(root, 'governanceRuleCatalogFile');
}

function readCatalogRules(workspacePath?: string): GovernanceRule[] {
  const filePath = catalogFile(workspacePath);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GovernanceRuleRegistryFile;
    const list = Array.isArray(raw?.rules) ? raw.rules : [];
    return normalizeRules(list).map((rule) => ({
      ...rule,
      disabled: rule.disabled === true,
      scope: rule.scope || { level: 'global' },
      metadata: {
        name: rule.metadata?.name || rule.id,
        description: rule.metadata?.description || '',
        version: rule.metadata?.version || '1.0.0',
        owner: rule.metadata?.owner || 'system',
        tags: Array.isArray(rule.metadata?.tags) ? rule.metadata?.tags : [],
        createdAt: rule.metadata?.createdAt || new Date().toISOString(),
        updatedAt: rule.metadata?.updatedAt || new Date().toISOString(),
      },
    }));
  } catch {
    return [];
  }
}

function writeCatalogRules(rules: GovernanceRule[], workspacePath?: string): void {
  const filePath = catalogFile(workspacePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ rules: normalizeRules(rules) }, null, 2), 'utf-8');
}

function historyFile(workspacePath?: string): string {
  const root = workspacePath || process.cwd();
  return path.resolve(root, 'docs/runtime/governance/rule-history.jsonl');
}

function appendRuleHistory(
  input: {
    action: GovernanceRuleHistoryEntry['action'];
    ruleId: string;
    actorId?: string;
    before: GovernanceRule | null;
    after: GovernanceRule;
  },
  workspacePath?: string,
): void {
  const row: GovernanceRuleHistoryEntry = {
    id: `rule-history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ruleId: input.ruleId,
    action: input.action,
    timestamp: new Date().toISOString(),
    actorId: input.actorId || 'system',
    before: input.before,
    after: input.after,
  };
  const filePath = historyFile(workspacePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf-8');
}

function bumpPatchVersion(version: string | undefined): string {
  const current = String(version || '1.0.0').trim();
  const parts = current.split('.');
  if (parts.length !== 3) return current;
  const [major, minor, patch] = parts.map((p) => Number(p));
  if ([major, minor, patch].some((n) => Number.isNaN(n) || n < 0)) return current;
  return `${major}.${minor}.${patch + 1}`;
}

export function loadGovernanceRules(workspacePath?: string): GovernanceRule[] {
  const base = readYamlRules(workspacePath);
  const overlay = readCatalogRules(workspacePath);
  if (!overlay.length) return base;
  const byId = new Map<string, GovernanceRule>();
  for (const rule of base) byId.set(rule.id, rule);
  for (const rule of overlay) byId.set(rule.id, rule);
  return Array.from(byId.values());
}

export function getRuleById(ruleId: GovernanceRule['id'], workspacePath?: string): GovernanceRule | undefined {
  return loadGovernanceRules(workspacePath).find((r) => r.id === ruleId);
}

export function createGovernanceRule(
  input: Omit<GovernanceRule, 'metadata'> & { metadata?: GovernanceRule['metadata'] },
  workspacePath?: string,
): GovernanceRule {
  const existing = loadGovernanceRules(workspacePath);
  if (existing.some((rule) => rule.id === input.id)) {
    throw new GovernanceRegistryError(`governance_rule_exists:${input.id}`);
  }
  const now = new Date().toISOString();
  const nextRule: GovernanceRule = {
    ...input,
    scope: input.scope || { level: 'global' },
    metadata: {
      name: input.metadata?.name || input.id,
      description: input.metadata?.description || '',
      version: input.metadata?.version || '1.0.0',
      owner: input.metadata?.owner || 'user',
      tags: Array.isArray(input.metadata?.tags) ? input.metadata?.tags : [],
      createdAt: input.metadata?.createdAt || now,
      updatedAt: now,
    },
  };
  writeCatalogRules([...existing, nextRule], workspacePath);
  appendRuleHistory(
    { action: 'create', ruleId: nextRule.id, actorId: 'api-user', before: null, after: nextRule },
    workspacePath,
  );
  return nextRule;
}

export function updateGovernanceRule(
  ruleId: string,
  patch: Partial<GovernanceRule>,
  workspacePath?: string,
): GovernanceRule {
  const current = loadGovernanceRules(workspacePath);
  const hit = current.find((rule) => rule.id === ruleId);
  if (!hit) {
    throw new GovernanceRegistryError(`governance_rule_not_found:${ruleId}`);
  }
  const now = new Date().toISOString();
  const nextVersion = patch.metadata?.version
    ? patch.metadata.version
    : bumpPatchVersion(hit.metadata?.version);
  const updated: GovernanceRule = {
    ...hit,
    ...patch,
    id: ruleId,
    metadata: {
      ...(hit.metadata || {}),
      ...(patch.metadata || {}),
      version: nextVersion,
      updatedAt: now,
    },
  };
  const next = current.map((rule) => (rule.id === ruleId ? updated : rule));
  writeCatalogRules(next, workspacePath);
  appendRuleHistory(
    { action: 'update', ruleId, actorId: 'api-user', before: hit, after: updated },
    workspacePath,
  );
  return updated;
}

export function disableGovernanceRule(
  ruleId: string,
  params?: { disabled?: boolean; projectId?: string },
  workspacePath?: string,
): GovernanceRule {
  const disabled = params?.disabled !== false;
  const current = loadGovernanceRules(workspacePath);
  const hit = current.find((rule) => rule.id === ruleId);
  if (!hit) {
    throw new GovernanceRegistryError(`governance_rule_not_found:${ruleId}`);
  }
  const updated: GovernanceRule = {
    ...hit,
    disabled,
    metadata: {
      ...(hit.metadata || {}),
      updatedAt: new Date().toISOString(),
    },
  };
  const next = current.map((rule) => (rule.id === ruleId ? updated : rule));
  writeCatalogRules(next, workspacePath);
  appendRuleHistory(
    { action: 'disable', ruleId, actorId: 'api-user', before: hit, after: updated },
    workspacePath,
  );
  return updated;
}

export function listGovernanceRuleHistory(ruleId: string, workspacePath?: string): GovernanceRuleHistoryEntry[] {
  const filePath = historyFile(workspacePath);
  if (!fs.existsSync(filePath)) return [];
  const rows = fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as GovernanceRuleHistoryEntry;
      } catch {
        return null;
      }
    })
    .filter((row): row is GovernanceRuleHistoryEntry => Boolean(row))
    .filter((row) => row.ruleId === ruleId);
  return rows.reverse();
}
