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
  action: 'create' | 'update' | 'disable' | 'delete';
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
    return parsed.map((rule) => {
      const is_enabled = rule.disabled !== true;
      return {
        ...rule,
        is_enabled,
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
          riskLevel: rule.metadata?.riskLevel || 'medium',
          impactArea: rule.metadata?.impactArea || ['reliability'],
          complianceDomain: rule.metadata?.complianceDomain || ['internal'],
        },
      };
    }) as GovernanceRule[];
  } catch (error) {
    if (error instanceof GovernanceRegistryError) {
      throw error;
    }
    throw new GovernanceRegistryError(`governance_rule_registry_unreadable:${filePath}`);
  }
}

function hasYamlRule(ruleId: string, workspacePath?: string): boolean {
  try {
    return readYamlRules(workspacePath).some((rule) => rule.id === ruleId);
  } catch {
    return false;
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
    return normalizeRules(list).map((rule) => {
      const is_enabled = rule.disabled !== true;
      return {
        ...rule,
        is_enabled,
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
          riskLevel: rule.metadata?.riskLevel || 'medium',
          impactArea: rule.metadata?.impactArea || ['reliability'],
          complianceDomain: rule.metadata?.complianceDomain || ['internal'],
        },
      };
    }) as GovernanceRule[];
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

/**
 * Creates a new governance rule and persists it to YAML.
 * AGSYS-2403: Rule Create API
 */
export function createGovernanceRule(data: Partial<GovernanceRule>, workspacePath?: string): GovernanceRule {
  const rules = loadGovernanceRules(workspacePath);
  const id = data.id || `rule_${Date.now()}`;
  
  if (rules.some(r => r.id === id)) {
    throw new GovernanceRegistryError(`governance_rule_exists:${id}`);
  }

  const now = new Date().toISOString();
  
  const newRule: GovernanceRule = {
    id,
    triggerPhases: data.triggerPhases || ['pre_execution'],
    evidence: data.evidence || [],
    evaluationType: data.evaluationType || 'deterministic',
    enforcementMode: data.enforcementMode || 'soft',
    enabledByDefault: data.enabledByDefault !== false,
    is_enabled: data.is_enabled !== false,
    disabled: data.is_enabled === false,
    scope: data.scope || { level: 'global' },
    metadata: {
      name: data.metadata?.name || id,
      description: data.metadata?.description || '',
      version: data.metadata?.version || '1.0.0',
      owner: data.metadata?.owner || 'system',
      tags: data.metadata?.tags || [],
      createdAt: now,
      updatedAt: now,
      riskLevel: data.metadata?.riskLevel || 'medium',
      impactArea: data.metadata?.impactArea || ['reliability'],
      complianceDomain: data.metadata?.complianceDomain || ['internal'],
    },
    thresholds: data.thresholds || {},
    deterministicCheck: data.deterministicCheck,
  };

  rules.push(newRule);
  writeCatalogRules(rules, workspacePath);
  appendRuleHistory(
    { action: 'create', ruleId: newRule.id, actorId: 'api-user', before: null, after: newRule },
    workspacePath,
  );
  return newRule;
}

/**
 * Updates an existing rule and persists the change.
 * AGSYS-2404: Rule Update API
 * AGSYS-2406/2407: Extend Rule Schema & Metadata Persistence
 */
export function updateGovernanceRule(
  id: string, 
  updates: Partial<GovernanceRule>,
  workspacePath?: string
): GovernanceRule {
  const rules = loadGovernanceRules(workspacePath);
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new GovernanceRegistryError(`governance_rule_not_found:${id}`);
  }

  const existing = rules[index];
  const now = new Date().toISOString();

  // Deep merge updates
  const updatedMetadata = updates.metadata ? {
    ...existing.metadata,
    ...updates.metadata,
    updatedAt: now,
  } : {
    ...existing.metadata,
    updatedAt: now,
  };

  const updatedRule: GovernanceRule = {
    ...existing,
    ...updates,
    id: existing.id, // ID cannot change
    disabled: updates.is_enabled !== undefined ? !updates.is_enabled : existing.disabled,
    is_enabled: updates.is_enabled !== undefined ? updates.is_enabled : existing.is_enabled,
    metadata: updatedMetadata,
  };

  rules[index] = updatedRule;
  writeCatalogRules(rules, workspacePath);
  appendRuleHistory(
    { action: 'update', ruleId: id, actorId: 'api-user', before: existing, after: updatedRule },
    workspacePath,
  );
  return updatedRule;
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
    is_enabled: !disabled,
    metadata: {
      ...hit.metadata,
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

export function deleteGovernanceRule(
  ruleId: string,
  params?: { force?: boolean },
  workspacePath?: string,
): { deletedRuleId: string; removedFromPolicies: boolean } {
  const current = loadGovernanceRules(workspacePath);
  const hit = current.find((rule) => rule.id === ruleId);
  if (!hit) {
    throw new GovernanceRegistryError(`governance_rule_not_found:${ruleId}`);
  }

  if (hasYamlRule(ruleId, workspacePath)) {
    throw new GovernanceRegistryError(`governance_rule_delete_forbidden_builtin:${ruleId}`);
  }

  const { findRulePolicyReferences, purgeRuleFromPolicies } = require('./ProjectPolicyBinding') as typeof import('./ProjectPolicyBinding');
  const refs = findRulePolicyReferences(ruleId, workspacePath);
  if (refs.length > 0 && !params?.force) {
    throw new GovernanceRegistryError(`governance_rule_in_use:${ruleId}:${JSON.stringify(refs)}`);
  }
  if (params?.force && refs.length > 0) {
    purgeRuleFromPolicies(ruleId, workspacePath);
  }

  const next = current.filter((rule) => rule.id !== ruleId);
  writeCatalogRules(next, workspacePath);
  appendRuleHistory(
    { action: 'delete', ruleId, actorId: 'api-user', before: hit, after: hit },
    workspacePath,
  );
  return { deletedRuleId: ruleId, removedFromPolicies: params?.force === true && refs.length > 0 };
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
