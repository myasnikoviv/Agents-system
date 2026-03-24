import {
  GitExecutionContext,
  validateMainBranchMutationPolicy,
  validatePreflightTokenPolicy,
} from './GitExecutionGuard';

export interface RoleExecutionEnvelope {
  role: string;
  pipeline: string;
  stage: string;
  ticketId: string;
  threadId: string;
  allowedTools: string[];
  guardrails: string[];
}

export interface PlannedToolAction {
  tool: string;
  purpose: string;
}

const ROLE_ALLOWED_TOOLS: Record<string, string[]> = {
  'pm-orchestrator': ['plane', 'filesystem', 'terminal', 'git'],
  'research-agent': ['filesystem', 'context7', 'terminal'],
  'solution-architect': ['filesystem', 'context7', 'terminal'],
  developer: ['filesystem', 'terminal', 'git'],
  'tdd-qa': ['filesystem', 'terminal'],
  'code-reviewer': ['filesystem', 'terminal'],
  'runner-backtest': ['filesystem', 'terminal'],
  'devops-engineer': ['filesystem', 'terminal', 'git'],
  'documentation-owner': ['filesystem'],
  'git-flow-manager': ['git', 'filesystem', 'terminal', 'plane'],
  'knowledge-curator': ['filesystem', 'plane'],
  'domain-validator': ['filesystem', 'context7'],
  'trader-analyst': ['filesystem', 'terminal'],
};

export function getAllowedToolsForRole(role: string): string[] {
  return ROLE_ALLOWED_TOOLS[role] || ['filesystem'];
}

export function buildRoleExecutionEnvelope(input: {
  role: string;
  pipeline: string;
  stage: string;
  ticketId: string;
  threadId: string;
}): RoleExecutionEnvelope {
  const allowedTools = getAllowedToolsForRole(input.role);
  return {
    ...input,
    allowedTools,
    guardrails: [
      'No tool outside allowedTools.',
      'No mutating actions before required governance gates.',
      'No handoff without evidence artifact.',
    ],
  };
}

export function validatePlannedToolActions(
  envelope: RoleExecutionEnvelope,
  plannedActions: PlannedToolAction[],
  executionContext?: GitExecutionContext,
  options?: { preflightDir?: string },
): { ok: boolean; blockedReason?: string } {
  for (const action of plannedActions) {
    if (!envelope.allowedTools.includes(action.tool)) {
      return {
        ok: false,
        blockedReason: `unauthorized_tool:${action.tool}`,
      };
    }
  }

  if (executionContext) {
    const hasMutatingAction = plannedActions.some((a) =>
      ['filesystem', 'git', 'terminal'].includes(a.tool),
    );
    const mutationPolicy = validateMainBranchMutationPolicy({
      context: executionContext,
      hasMutatingAction,
    });
    if (!mutationPolicy.ok) {
      return {
        ok: false,
        blockedReason: mutationPolicy.reason,
      };
    }

    const preflightPolicy = validatePreflightTokenPolicy({
      context: executionContext,
      hasMutatingAction,
      preflightDir: options?.preflightDir,
    });
    if (!preflightPolicy.ok) {
      return {
        ok: false,
        blockedReason: preflightPolicy.reason,
      };
    }
  }
  return { ok: true };
}
