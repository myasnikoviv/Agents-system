import fs from 'fs';
import path from 'path';
import type { GovernanceRule } from './GovernanceEngineTypes';
import { loadGovernanceRules } from './RuleRegistry';
import type { GovernanceLoopEntity } from './LoopRegistry';
import { loadGovernanceLoops } from './LoopRegistry';
import type { GovernanceManualOverride } from './ManualOverrideRegistry';
import { listManualOverrides } from './ManualOverrideRegistry';
import type { ProjectExecutionProfile, ProjectGitPolicy } from './ProjectPolicyBinding';
import { getProjectPolicy } from './ProjectPolicyBinding';

export interface GovernanceRuleEntity extends GovernanceRule {}

export interface GovernanceProfileEntity {
  projectId: string;
  executionProfile: ProjectExecutionProfile;
  gitPolicy: ProjectGitPolicy;
  enabledRules: string[];
  disabledRules: string[];
}

export interface GovernanceArtifactEntity {
  category: 'compliance' | 'cost' | 'adaptive' | 'improvement' | 'ledger' | 'governance-log';
  relativePath: string;
  exists: boolean;
}

export interface GovernanceDataModelSnapshot {
  rules: GovernanceRuleEntity[];
  loops: GovernanceLoopEntity[];
  profiles: GovernanceProfileEntity[];
  overrides: GovernanceManualOverride[];
  artifacts: GovernanceArtifactEntity[];
}

function toRelative(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).replace(/\\/g, '/');
}

function collectArtifactEntities(workspacePath?: string): GovernanceArtifactEntity[] {
  const root = workspacePath || process.cwd();
  const probes: Array<{ category: GovernanceArtifactEntity['category']; file: string }> = [
    { category: 'compliance', file: path.resolve(root, 'docs/process/runs/compliance') },
    { category: 'cost', file: path.resolve(root, 'docs/process/runs/cost') },
    { category: 'adaptive', file: path.resolve(root, 'docs/process/runs/adaptive') },
    { category: 'improvement', file: path.resolve(root, 'docs/process/improvements') },
    { category: 'ledger', file: path.resolve(root, 'docs/process/runs/ledger') },
    { category: 'governance-log', file: path.resolve(root, 'docs/runtime/governance/logs') },
  ];
  return probes.map((probe) => ({
    category: probe.category,
    relativePath: toRelative(root, probe.file),
    exists: fs.existsSync(probe.file),
  }));
}

export function buildGovernanceDataModelSnapshot(input: {
  workspacePath?: string;
  projectIds?: string[];
} = {}): GovernanceDataModelSnapshot {
  const workspacePath = input.workspacePath || process.cwd();
  const projectIds = (input.projectIds || []).filter(Boolean);

  return {
    rules: loadGovernanceRules(workspacePath),
    loops: loadGovernanceLoops(workspacePath),
    profiles: projectIds.map((projectId) => {
      const policy = getProjectPolicy(projectId, workspacePath);
      return {
        projectId: policy.projectId,
        executionProfile: policy.executionProfile,
        gitPolicy: policy.gitPolicy,
        enabledRules: policy.enabledRules,
        disabledRules: policy.disabledRules,
      };
    }),
    overrides: listManualOverrides(workspacePath),
    artifacts: collectArtifactEntities(workspacePath),
  };
}
