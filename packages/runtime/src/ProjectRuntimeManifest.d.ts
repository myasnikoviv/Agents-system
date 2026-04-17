export interface ManifestProjectInfo {
    id: string;
    name: string;
    rootPath: string;
}
export interface ManifestAgentSpec {
    id: string;
    callsign: string;
    file: string;
    capabilities: string[];
    guardrails: string[];
    defaultSkills: string[];
}
export interface ManifestSkillTriggerRule {
    useWhen: string;
    avoidWhen: string;
    keywords: string[];
}
export interface ManifestSkillSpec {
    id: string;
    name: string;
    source: string;
    triggerRules: ManifestSkillTriggerRule[];
}
export interface ManifestStageSpec {
    id: string;
    role: string;
    requiredGates: string[];
    outputs: string[];
}
export interface ManifestTransitionSpec {
    from: string;
    to: string;
    condition?: string;
}
export interface ManifestSelectionRule {
    keywords: string[];
    scoreWeight?: number;
}
export interface ManifestPipelineSpec {
    id: string;
    source: string;
    stages: ManifestStageSpec[];
    transitions: ManifestTransitionSpec[];
    selectionRules: ManifestSelectionRule[];
    default?: boolean;
}
export interface ManifestGateSpec {
    id: string;
    type: 'pre-stage' | 'post-stage' | 'pre-pipeline-close';
    rule: string;
    severity: 'hard' | 'soft';
    failureStatus: 'blocked' | 'rework';
}
export interface ManifestPolicySpec {
    gates: ManifestGateSpec[];
}
export interface ProjectRuntimeManifest {
    manifestVersion: '1.0';
    project: ManifestProjectInfo;
    agents: ManifestAgentSpec[];
    skills: ManifestSkillSpec[];
    pipelines: ManifestPipelineSpec[];
    policies: ManifestPolicySpec;
    metadata?: Record<string, string>;
}
export interface ManifestValidationIssue {
    code: string;
    message: string;
    path?: string;
    severity: 'error' | 'warning';
}
