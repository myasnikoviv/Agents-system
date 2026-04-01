import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { GovernanceRule } from './GovernanceEngineTypes';

interface GovernanceRuleRegistryFile {
  rules?: GovernanceRule[];
}

export const DEFAULT_GOVERNANCE_RULES: GovernanceRule[] = [
  {
    id: 'git_preflight',
    triggerPhases: ['before_execution'],
    evidence: ['docs/process/git/preflights/<ticket>.env'],
    evaluationType: 'deterministic',
    enforcementMode: 'hard',
    enabledByDefault: true,
  },
  {
    id: 'postflight_evidence',
    triggerPhases: ['before_task_close'],
    evidence: ['docs/process/tests/<ticket>.md'],
    evaluationType: 'deterministic',
    enforcementMode: 'hard',
    enabledByDefault: true,
  },
  {
    id: 'improvement_loop',
    triggerPhases: ['after_execution'],
    evidence: ['docs/process/retrospectives/**', 'docs/knowledge/lessons-learned/**'],
    evaluationType: 'deterministic',
    enforcementMode: 'soft',
    enabledByDefault: true,
  },
  {
    id: 'required_agent_usage',
    triggerPhases: ['after_execution'],
    evidence: ['agent.started events'],
    evaluationType: 'deterministic',
    enforcementMode: 'soft',
    enabledByDefault: true,
  },
  {
    id: 'required_pipeline_usage',
    triggerPhases: ['after_execution'],
    evidence: ['stage.started events'],
    evaluationType: 'deterministic',
    enforcementMode: 'soft',
    enabledByDefault: true,
  },
  {
    id: 'cost_guard_light',
    triggerPhases: ['after_execution'],
    evidence: ['token telemetry'],
    evaluationType: 'deterministic',
    enforcementMode: 'advisory',
    enabledByDefault: true,
  },
];

export function getRuleById(ruleId: GovernanceRule['id']): GovernanceRule | undefined {
  return DEFAULT_GOVERNANCE_RULES.find((r) => r.id === ruleId);
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
    return DEFAULT_GOVERNANCE_RULES;
  }

  try {
    const raw = yaml.load(fs.readFileSync(filePath, 'utf-8')) as GovernanceRuleRegistryFile;
    if (!raw?.rules || !Array.isArray(raw.rules) || raw.rules.length === 0) {
      return DEFAULT_GOVERNANCE_RULES;
    }
    const parsed = normalizeRules(raw.rules);
    return parsed.length > 0 ? parsed : DEFAULT_GOVERNANCE_RULES;
  } catch {
    return DEFAULT_GOVERNANCE_RULES;
  }
}
