export type WorkerHeatMode = 'hot' | 'cold';

export interface WorkerHeatPolicy {
  version: string;
  hotAgents: string[];
  coldByDefault: boolean;
}

const DEFAULT_POLICY: WorkerHeatPolicy = {
  version: 's26-v1',
  hotAgents: ['pm-orchestrator', 'system-core'],
  coldByDefault: true,
};

export function resolveWorkerHeatPolicy(): WorkerHeatPolicy {
  return {
    ...DEFAULT_POLICY,
    hotAgents: Array.from(new Set(DEFAULT_POLICY.hotAgents.map((x) => String(x || '').trim()).filter(Boolean))),
  };
}

export function resolveWorkerHeatMode(agentSlug: string): WorkerHeatMode {
  const policy = resolveWorkerHeatPolicy();
  const slug = String(agentSlug || '').trim();
  if (policy.hotAgents.includes(slug)) return 'hot';
  return policy.coldByDefault ? 'cold' : 'hot';
}
