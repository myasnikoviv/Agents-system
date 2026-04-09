export interface RuntimeAgentIdentity {
  projectId: string;
  agentSlug: string;
  workerId: string;
  identityKey: string;
  memoryNamespace: string;
}

const localIdentityRegistry = new Map<string, string>(); // workerId -> projectId

function normalize(value: string, fallback: string): string {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
}

export function buildAgentIdentity(input: {
  projectId: string;
  agentSlug: string;
  workerId?: string;
}): RuntimeAgentIdentity {
  const projectId = normalize(input.projectId, 'default');
  const agentSlug = normalize(input.agentSlug, 'system-core');
  const workerId = normalize(
    input.workerId || `${projectId}-${agentSlug}-pid${process.pid}-${Date.now().toString(36)}`,
    `${agentSlug}-pid${process.pid}`,
  );
  const identityKey = `${projectId}:${agentSlug}:${workerId}`;
  const memoryNamespace = `memory:${projectId}:${agentSlug}`;
  return { projectId, agentSlug, workerId, identityKey, memoryNamespace };
}

export function assertWorkerProjectIsolation(identity: RuntimeAgentIdentity): {
  ok: boolean;
  reason?: string;
} {
  const existingProject = localIdentityRegistry.get(identity.workerId);
  if (existingProject && existingProject !== identity.projectId) {
    return {
      ok: false,
      reason: `worker_id_collision_across_projects:${identity.workerId}:${existingProject}->${identity.projectId}`,
    };
  }
  localIdentityRegistry.set(identity.workerId, identity.projectId);
  return { ok: true };
}

export function clearIdentityRegistry(): void {
  localIdentityRegistry.clear();
}
