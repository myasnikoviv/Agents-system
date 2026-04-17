import { ComplianceEvaluationResult } from './ComplianceTypes';

const MAX_RETRY = 1;
const retryCount = new Map<string, number>();

export interface ComplianceEnforcementDecision {
  action: 'allow' | 'retry' | 'deviation';
  retryCount: number;
  reason: string;
}

export function applyComplianceEnforcement(result: ComplianceEvaluationResult): ComplianceEnforcementDecision {
  if (result.passed) {
    return { action: 'allow', retryCount: retryCount.get(result.runId) || 0, reason: 'compliance_passed' };
  }

  const current = retryCount.get(result.runId) || 0;
  if (current < MAX_RETRY) {
    const next = current + 1;
    retryCount.set(result.runId, next);
    return { action: 'retry', retryCount: next, reason: 'compliance_mismatch_retry_once' };
  }

  return { action: 'deviation', retryCount: current, reason: 'compliance_mismatch_after_retry' };
}

export function resetComplianceEnforcementState(): void {
  retryCount.clear();
}
