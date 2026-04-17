export type GovernancePhase =
  | 'BEFORE_RUN'
  | 'AFTER_STEP'
  | 'AFTER_RUN'
  | 'before_execution'
  | 'after_execution'
  | 'before_task_close'
  | 'pre_execution'
  | 'post_execution'
  | 'pre_task_close';

export type GovernanceEvaluationType = 'deterministic' | 'hybrid' | 'llm';
export type GovernanceEnforcementMode = 'hard' | 'soft' | 'advisory';
export type GovernanceDeterministicCheck = string;
export type GovernanceScopeLevel = 'global' | 'project' | 'session';

export type GovernanceRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type GovernanceImpactArea = 'cost' | 'security' | 'architecture' | 'legal' | 'reliability';
export type GovernanceComplianceDomain = 'internal' | 'gdpr' | 'soc2' | 'hipaa' | 'financial';

export interface GovernanceRuleMetadata {
  name: string;
  description: string;
  version: string;
  owner: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  riskLevel?: GovernanceRiskLevel;
  impactArea?: GovernanceImpactArea[];
  complianceDomain?: GovernanceComplianceDomain[];
}

export interface GovernanceRuleScope {
  level: GovernanceScopeLevel;
  projectId?: string;
  sessionId?: string;
}

export interface GovernanceRule {
  id: string;
  triggerPhases: GovernancePhase[];
  evidence: string[];
  evaluationType: GovernanceEvaluationType;
  deterministicCheck?: GovernanceDeterministicCheck;
  enforcementMode: GovernanceEnforcementMode;
  enabledByDefault: boolean;
  is_enabled: boolean;
  disabled?: boolean;
  scope: GovernanceRuleScope;
  metadata: GovernanceRuleMetadata;
  thresholds?: Record<string, number>;
  project_overrides?: Record<string, Partial<GovernanceRule>>;
}

export interface GovernanceEngineContext {
  runId: string;
  projectId: string;
  ticketId: string;
  chainId: string;
  workspacePath?: string;
  pipelineId?: string;
  hasMutatingAction?: boolean;
  bypassToken?: string;
}

export interface GovernanceRuleEvaluation {
  ruleId: GovernanceRule['id'];
  verdict: 'pass' | 'fail' | 'unknown';
  reason: string;
  evidenceSummary: string;
}

export interface GovernancePhaseResult {
  phase: GovernancePhase;
  blocked: boolean;
  action: 'allow' | 'block' | 'retry' | 'warn' | 'skip' | 'escalate';
  entries: GovernanceRuleEvaluation[];
  retrySuggested: boolean;
}
