import type { GovernanceRule } from './GovernanceEngineTypes';
import type { GovernanceLoopEntity } from './LoopRegistry';
import type { GovernanceManualOverride } from './ManualOverrideRegistry';
import type { ProjectExecutionProfile, ProjectGitPolicy } from './ProjectPolicyBinding';
export interface GovernanceRuleEntity extends GovernanceRule {
}
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
export declare function buildGovernanceDataModelSnapshot(input?: {
    workspacePath?: string;
    projectIds?: string[];
}): GovernanceDataModelSnapshot;
