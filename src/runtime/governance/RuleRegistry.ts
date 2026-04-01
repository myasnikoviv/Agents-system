import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { GovernanceRule } from './GovernanceEngineTypes';

interface GovernanceRuleRegistryFile {
  rules?: GovernanceRule[];
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

export function loadGovernanceRules(workspacePath?: string): GovernanceRule[] {
  const root = workspacePath || process.cwd();
  const filePath = path.resolve(root, 'docs/runtime/governance/rule-registry.yaml');
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
    return parsed;
  } catch (error) {
    if (error instanceof GovernanceRegistryError) {
      throw error;
    }
    throw new GovernanceRegistryError(`governance_rule_registry_unreadable:${filePath}`);
  }
}

export function getRuleById(ruleId: GovernanceRule['id'], workspacePath?: string): GovernanceRule | undefined {
  return loadGovernanceRules(workspacePath).find((r) => r.id === ruleId);
}
