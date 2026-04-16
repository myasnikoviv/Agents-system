import fs from 'fs';
import path from 'path';
import { GovernanceRule } from './GovernanceEngineTypes';
import { loadGovernanceRules } from './RuleRegistry';
import { resolveRuntimePath } from '@system/shared';

interface PolicyConfig {
  defaultEnabledRules?: GovernanceRule['id'][];
  projects?: Record<
    string,
    {
      enabledRules?: GovernanceRule['id'][];
      disabledRules?: GovernanceRule['id'][];
      ruleOverrides?: Record<string, { evidence?: string[]; thresholds?: Record<string, number> }>;
      executionProfile?: ProjectExecutionProfile;
      gitPolicy?: Partial<ProjectGitPolicy>;
    }
  >;
}

export type ProjectExecutionProfile = 'engineering' | 'non_engineering';

export interface ProjectGitPolicy {
  enforceMainBranchProtection: boolean;
  requirePreflightToken: boolean;
  requireWorktreeIsolation: boolean;
  allowGitMutations: boolean;
}

const PROJECT_PROFILE_DEFAULTS: Record<ProjectExecutionProfile, ProjectGitPolicy> = {
  engineering: {
    enforceMainBranchProtection: true,
    requirePreflightToken: true,
    requireWorktreeIsolation: true,
    allowGitMutations: true,
  },
  non_engineering: {
    enforceMainBranchProtection: false,
    requirePreflightToken: false,
    requireWorktreeIsolation: false,
    allowGitMutations: false,
  },
};

function normalizeExecutionProfile(raw: unknown): ProjectExecutionProfile {
  const value = String(raw || '').trim().toLowerCase();
  return value === 'non_engineering' ? 'non_engineering' : 'engineering';
}

function buildEffectiveGitPolicy(
  profile: ProjectExecutionProfile,
  patch?: Partial<ProjectGitPolicy> | null,
): ProjectGitPolicy {
  return {
    ...PROJECT_PROFILE_DEFAULTS[profile],
    ...(patch || {}),
  };
}

export function loadPolicyConfig(workspacePath?: string): PolicyConfig {
  const root = workspacePath || process.cwd();
  const governanceRules = loadGovernanceRules(workspacePath);
  const file = resolveRuntimePath(root, 'governanceProjectPolicyFile');
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

function savePolicyConfig(cfg: PolicyConfig, workspacePath?: string): void {
  const root = workspacePath || process.cwd();
  const file = resolveRuntimePath(root, 'governanceProjectPolicyFile');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf-8');
}

export interface RulePolicyReference {
  type: 'defaultEnabled' | 'projectEnabled' | 'projectDisabled' | 'projectOverride';
  projectId?: string;
}

export function findRulePolicyReferences(ruleId: string, workspacePath?: string): RulePolicyReference[] {
  const cfg = loadPolicyConfig(workspacePath);
  const refs: RulePolicyReference[] = [];
  if ((cfg.defaultEnabledRules || []).includes(ruleId)) {
    refs.push({ type: 'defaultEnabled' });
  }
  for (const [projectId, projectCfg] of Object.entries(cfg.projects || {})) {
    if ((projectCfg.enabledRules || []).includes(ruleId)) refs.push({ type: 'projectEnabled', projectId });
    if ((projectCfg.disabledRules || []).includes(ruleId)) refs.push({ type: 'projectDisabled', projectId });
    if (projectCfg.ruleOverrides && Object.prototype.hasOwnProperty.call(projectCfg.ruleOverrides, ruleId)) {
      refs.push({ type: 'projectOverride', projectId });
    }
  }
  return refs;
}

export function purgeRuleFromPolicies(ruleId: string, workspacePath?: string): void {
  const cfg = loadPolicyConfig(workspacePath);
  cfg.defaultEnabledRules = (cfg.defaultEnabledRules || []).filter((id) => id !== ruleId);
  for (const projectCfg of Object.values(cfg.projects || {})) {
    if (projectCfg.enabledRules) {
      projectCfg.enabledRules = projectCfg.enabledRules.filter((id) => id !== ruleId);
    }
    if (projectCfg.disabledRules) {
      projectCfg.disabledRules = projectCfg.disabledRules.filter((id) => id !== ruleId);
    }
    if (projectCfg.ruleOverrides && Object.prototype.hasOwnProperty.call(projectCfg.ruleOverrides, ruleId)) {
      delete projectCfg.ruleOverrides[ruleId];
    }
  }
  savePolicyConfig(cfg, workspacePath);
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

export function getProjectPolicy(projectId: string, workspacePath?: string): {
  projectId: string;
  defaultEnabledRules: GovernanceRule['id'][];
  enabledRules: GovernanceRule['id'][];
  disabledRules: GovernanceRule['id'][];
  ruleOverrides: Record<string, { evidence?: string[]; thresholds?: Record<string, number> }>;
  executionProfile: ProjectExecutionProfile;
  gitPolicy: ProjectGitPolicy;
} {
  const cfg = loadPolicyConfig(workspacePath);
  const defaults = cfg.defaultEnabledRules || [];
  const projectCfg = cfg.projects?.[projectId] || {};
  const executionProfile = normalizeExecutionProfile(projectCfg.executionProfile);
  return {
    projectId,
    defaultEnabledRules: defaults,
    enabledRules: projectCfg.enabledRules || defaults,
    disabledRules: projectCfg.disabledRules || [],
    ruleOverrides: projectCfg.ruleOverrides || {},
    executionProfile,
    gitPolicy: buildEffectiveGitPolicy(executionProfile, projectCfg.gitPolicy),
  };
}

export function updateProjectPolicy(
  projectId: string,
  patch: {
    enabledRules?: GovernanceRule['id'][];
    disabledRules?: GovernanceRule['id'][];
    ruleOverrides?: Record<string, { evidence?: string[]; thresholds?: Record<string, number> }>;
    executionProfile?: ProjectExecutionProfile;
    gitPolicy?: Partial<ProjectGitPolicy>;
  },
  workspacePath?: string,
): ReturnType<typeof getProjectPolicy> {
  const cfg = loadPolicyConfig(workspacePath);
  if (!cfg.projects) cfg.projects = {};
  const prev = cfg.projects[projectId] || {};
  cfg.projects[projectId] = {
    ...prev,
    ...(patch.enabledRules ? { enabledRules: patch.enabledRules } : {}),
    ...(patch.disabledRules ? { disabledRules: patch.disabledRules } : {}),
    ...(patch.ruleOverrides ? { ruleOverrides: patch.ruleOverrides } : {}),
    ...(patch.executionProfile ? { executionProfile: normalizeExecutionProfile(patch.executionProfile) } : {}),
    ...(patch.gitPolicy ? { gitPolicy: patch.gitPolicy } : {}),
  };
  savePolicyConfig(cfg, workspacePath);
  return getProjectPolicy(projectId, workspacePath);
}

export function resolveProjectExecutionProfile(projectId: string, workspacePath?: string): ProjectExecutionProfile {
  return getProjectPolicy(projectId, workspacePath).executionProfile;
}

export function resolveProjectGitPolicy(projectId: string, workspacePath?: string): ProjectGitPolicy {
  return getProjectPolicy(projectId, workspacePath).gitPolicy;
}
