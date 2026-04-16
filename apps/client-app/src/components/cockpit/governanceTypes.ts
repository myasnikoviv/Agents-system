export type EnforcementMode = 'soft' | 'hard';
export type EvaluationType = 'deterministic' | 'heuristic' | 'agentic';

export interface GovernanceRuleMetadata {
  name: string;
  description: string;
  version: string;
  owner: string;
  tags?: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  impactArea: string[];
  complianceDomain: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernanceRule {
  id: string;
  metadata: GovernanceRuleMetadata;
  triggerPhases: string[];
  evidence: string[];
  evaluationType: EvaluationType;
  enforcementMode: EnforcementMode;
  enabledByDefault: boolean;
  is_enabled: boolean;
  disabled: boolean;
  effectiveEnabled?: boolean;
  scope: {
    level: 'global' | 'project';
    projectId?: string;
  };
  thresholds?: Record<string, number>;
}

export interface ProjectPolicy {
  projectId: string;
  defaultEnabledRules: string[];
  enabledRules: string[];
  disabledRules: string[];
  ruleOverrides: Record<string, { evidence?: string[]; thresholds?: Record<string, number> }>;
  executionProfile: 'engineering' | 'non_engineering';
  gitPolicy: {
    enforceMainBranchProtection: boolean;
    requirePreflightToken: boolean;
    requireWorktreeIsolation: boolean;
    allowGitMutations: boolean;
  };
}

export type GovernanceStatus = 'pass' | 'fail' | 'skip';
export type GovernanceAction = 'block' | 'retry' | 'allow' | 'warn' | 'log' | 'escalate';

export interface GovernanceLogEntry {
  rule: string;
  status: GovernanceStatus;
  action: GovernanceAction;
  ticket?: string;
  runId?: string;
  chainId?: string;
  detail?: string;
  ts: string;
}

export interface GovernanceManualOverride {
  id: string;
  projectId: string;
  scope: 'global' | 'phase' | 'rule';
  phase?: string;
  ruleId?: string;
  ticketId?: string;
  actorId: string;
  reason: string;
  createdAt: string;
  expiresAt?: string;
  enabled: boolean;
}
