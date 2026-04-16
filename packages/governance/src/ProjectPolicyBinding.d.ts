import { GovernanceRule } from './GovernanceEngineTypes';
interface PolicyConfig {
    defaultEnabledRules?: GovernanceRule['id'][];
    projects?: Record<string, {
        enabledRules?: GovernanceRule['id'][];
        disabledRules?: GovernanceRule['id'][];
        ruleOverrides?: Record<string, {
            evidence?: string[];
            thresholds?: Record<string, number>;
        }>;
        executionProfile?: ProjectExecutionProfile;
        gitPolicy?: Partial<ProjectGitPolicy>;
    }>;
}
export type ProjectExecutionProfile = 'engineering' | 'non_engineering';
export interface ProjectGitPolicy {
    enforceMainBranchProtection: boolean;
    requirePreflightToken: boolean;
    requireWorktreeIsolation: boolean;
    allowGitMutations: boolean;
}
export declare function loadPolicyConfig(workspacePath?: string): PolicyConfig;
export interface RulePolicyReference {
    type: 'defaultEnabled' | 'projectEnabled' | 'projectDisabled' | 'projectOverride';
    projectId?: string;
}
export declare function findRulePolicyReferences(ruleId: string, workspacePath?: string): RulePolicyReference[];
export declare function purgeRuleFromPolicies(ruleId: string, workspacePath?: string): void;
export declare function resolveEnabledRules(projectId: string, workspacePath?: string): Set<GovernanceRule['id']>;
export declare function getProjectPolicy(projectId: string, workspacePath?: string): {
    projectId: string;
    defaultEnabledRules: GovernanceRule['id'][];
    enabledRules: GovernanceRule['id'][];
    disabledRules: GovernanceRule['id'][];
    ruleOverrides: Record<string, {
        evidence?: string[];
        thresholds?: Record<string, number>;
    }>;
    executionProfile: ProjectExecutionProfile;
    gitPolicy: ProjectGitPolicy;
};
export declare function updateProjectPolicy(projectId: string, patch: {
    enabledRules?: GovernanceRule['id'][];
    disabledRules?: GovernanceRule['id'][];
    ruleOverrides?: Record<string, {
        evidence?: string[];
        thresholds?: Record<string, number>;
    }>;
    executionProfile?: ProjectExecutionProfile;
    gitPolicy?: Partial<ProjectGitPolicy>;
}, workspacePath?: string): ReturnType<typeof getProjectPolicy>;
export declare function resolveProjectExecutionProfile(projectId: string, workspacePath?: string): ProjectExecutionProfile;
export declare function resolveProjectGitPolicy(projectId: string, workspacePath?: string): ProjectGitPolicy;
export {};
