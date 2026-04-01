import fs from 'fs';
import path from 'path';
import { GovernanceRule } from './GovernanceEngineTypes';
import { loadGovernanceRules } from './RuleRegistry';

interface PolicyConfig {
  defaultEnabledRules?: GovernanceRule['id'][];
  projects?: Record<string, { enabledRules?: GovernanceRule['id'][]; disabledRules?: GovernanceRule['id'][] }>;
}

function loadPolicyConfig(workspacePath?: string): PolicyConfig {
  const root = workspacePath || process.cwd();
  const governanceRules = loadGovernanceRules(workspacePath);
  const file = path.resolve(root, 'docs/runtime/governance/project-policy.json');
  if (!fs.existsSync(file)) {
    return {
      defaultEnabledRules: governanceRules.filter((r) => r.enabledByDefault).map((r) => r.id),
      projects: {},
    };
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as PolicyConfig;
  } catch {
    return { defaultEnabledRules: governanceRules.filter((r) => r.enabledByDefault).map((r) => r.id), projects: {} };
  }
}

export function resolveEnabledRules(projectId: string, workspacePath?: string): Set<GovernanceRule['id']> {
  const cfg = loadPolicyConfig(workspacePath);
  const defaults = new Set<GovernanceRule['id']>(cfg.defaultEnabledRules || []);
  const projectCfg = cfg.projects?.[projectId];
  if (!projectCfg) return defaults;
  const set = new Set<GovernanceRule['id']>(projectCfg.enabledRules || Array.from(defaults));
  for (const id of projectCfg.disabledRules || []) set.delete(id);
  return set;
}
