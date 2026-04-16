const AGENT_WORKER_TYPE_MAP: Record<string, string> = {
  'pm-orchestrator': 'worker.pm-orchestrator',
  'solution-architect': 'worker.solution-architect',
  developer: 'worker.developer',
  'tdd-qa': 'worker.tdd-qa',
  'code-reviewer': 'worker.code-reviewer',
  'research-agent': 'worker.research-agent',
  'knowledge-curator': 'worker.knowledge-curator',
  'runner-backtest': 'worker.runner-backtest',
  'domain-validator': 'worker.domain-validator',
  'git-flow-manager': 'worker.git-flow-manager',
  'documentation-owner': 'worker.documentation-owner',
  'devops-engineer': 'worker.devops-engineer',
  'design-lead': 'worker.design-lead',
  'audit-agent': 'worker.audit-agent',
  'system-core': 'worker.system-core',
};

export function resolveWorkerTypeForAgent(agentSlug: string): string {
  const slug = String(agentSlug || '').trim() || 'system-core';
  return AGENT_WORKER_TYPE_MAP[slug] || `worker.custom.${slug}`;
}

