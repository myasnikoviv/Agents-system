export interface GitExecutionContext {
    branch: string;
    worktreePath: string;
}
export interface MutationPolicyCheck {
    ok: boolean;
    reason?: string;
}
export declare function getGitExecutionContext(repoRoot?: string): GitExecutionContext;
export declare function validateMainBranchMutationPolicy(input: {
    context: GitExecutionContext;
    hasMutatingAction: boolean;
}): MutationPolicyCheck;
export declare function validatePreflightTokenPolicy(input: {
    context: GitExecutionContext;
    hasMutatingAction: boolean;
    preflightDir?: string;
}): MutationPolicyCheck;
export declare function resolveMatchingPreflightTokenPath(input: {
    context: GitExecutionContext;
    preflightDir?: string;
}): string;
