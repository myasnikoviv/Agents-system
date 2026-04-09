export type EnvironmentState =
  | 'provisioning'
  | 'warming'
  | 'active'
  | 'idle'
  | 'suspended'
  | 'terminated'
  | 'failed';

export interface RuntimeEnvironmentRecord {
  environmentId: string;
  tenantId: string;
  workspaceId: string;
  projectId?: string;
  state: EnvironmentState;
  updatedAt: string;
}

export interface EnvironmentTransitionEvent {
  environmentId: string;
  tenantId: string;
  workspaceId: string;
  projectId?: string;
  from: EnvironmentState;
  to: EnvironmentState;
  reason?: string;
  actorId?: string;
  timestamp: string;
}

const ALLOWED_TRANSITIONS: Record<EnvironmentState, EnvironmentState[]> = {
  provisioning: ['warming', 'failed', 'terminated'],
  warming: ['active', 'failed', 'terminated'],
  active: ['idle', 'suspended', 'terminated', 'failed'],
  idle: ['active', 'suspended', 'terminated', 'failed'],
  suspended: ['warming', 'active', 'terminated', 'failed'],
  terminated: [],
  failed: ['provisioning', 'warming', 'terminated'],
};

function normalize(value: string | undefined, fallback: string): string {
  const v = String(value || '').trim();
  return v || fallback;
}

export function buildEnvironmentId(input: {
  tenantId: string;
  workspaceId: string;
  projectId?: string;
}): string {
  const tenantId = normalize(input.tenantId, 'tenant:default');
  const workspaceId = normalize(input.workspaceId, 'workspace:default');
  const projectId = String(input.projectId || '').trim();
  return projectId
    ? `env:${tenantId}:${workspaceId}:project:${projectId}`
    : `env:${tenantId}:${workspaceId}`;
}

export function createEnvironmentRecord(input: {
  tenantId: string;
  workspaceId: string;
  projectId?: string;
  initialState?: EnvironmentState;
}): RuntimeEnvironmentRecord {
  const tenantId = normalize(input.tenantId, 'tenant:default');
  const workspaceId = normalize(input.workspaceId, 'workspace:default');
  const projectId = String(input.projectId || '').trim() || undefined;
  const environmentId = buildEnvironmentId({ tenantId, workspaceId, projectId });
  return {
    environmentId,
    tenantId,
    workspaceId,
    ...(projectId ? { projectId } : {}),
    state: input.initialState || 'provisioning',
    updatedAt: new Date().toISOString(),
  };
}

export function canTransitionEnvironment(from: EnvironmentState, to: EnvironmentState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionEnvironment(
  current: RuntimeEnvironmentRecord,
  to: EnvironmentState,
  input?: { reason?: string; actorId?: string; now?: string },
): { next: RuntimeEnvironmentRecord; event: EnvironmentTransitionEvent } | { error: string } {
  if (!canTransitionEnvironment(current.state, to)) {
    return { error: `invalid_transition:${current.state}->${to}` };
  }
  const timestamp = String(input?.now || new Date().toISOString());
  const next: RuntimeEnvironmentRecord = {
    ...current,
    state: to,
    updatedAt: timestamp,
  };
  const event: EnvironmentTransitionEvent = {
    environmentId: current.environmentId,
    tenantId: current.tenantId,
    workspaceId: current.workspaceId,
    ...(current.projectId ? { projectId: current.projectId } : {}),
    from: current.state,
    to,
    ...(input?.reason ? { reason: input.reason } : {}),
    ...(input?.actorId ? { actorId: input.actorId } : {}),
    timestamp,
  };
  return { next, event };
}
