export interface RuntimeUser {
  userId: string;
  tenantId: string;
  defaultWorkspaceId: string;
  role: 'member' | 'admin';
}

export interface RuntimeTenant {
  tenantId: string;
  slug: string;
  name: string;
  active: boolean;
}

export interface RuntimeWorkspace {
  workspaceId: string;
  tenantId: string;
  slug: string;
  name: string;
  active: boolean;
}

export interface RuntimeProject {
  projectId: string;
  workspaceId: string;
  tenantId: string;
  slug: string;
  name: string;
}

export type RuntimeEnvironmentState =
  | 'provisioning'
  | 'warming'
  | 'active'
  | 'idle'
  | 'suspended'
  | 'terminated'
  | 'failed';

export interface RuntimeEnvironment {
  environmentId: string;
  tenantId: string;
  workspaceId: string;
  projectId?: string;
  state: RuntimeEnvironmentState;
}

export interface RuntimeDomainSnapshot {
  users: RuntimeUser[];
  tenants: RuntimeTenant[];
  workspaces: RuntimeWorkspace[];
  projects: RuntimeProject[];
  environments: RuntimeEnvironment[];
}

function normalize(value: string | undefined): string {
  return String(value || '').trim();
}

export function deterministicTenantIdForProject(projectId: string): string {
  const id = normalize(projectId) || 'default-project';
  return `tenant:${id}`;
}

export function deterministicWorkspaceIdForProject(projectId: string): string {
  const id = normalize(projectId) || 'default-project';
  return `workspace:${id}`;
}

export function deterministicEnvironmentId(input: {
  tenantId: string;
  workspaceId: string;
  projectId?: string;
}): string {
  const tenantId = normalize(input.tenantId) || 'tenant:default-project';
  const workspaceId = normalize(input.workspaceId) || 'workspace:default-project';
  const projectId = normalize(input.projectId);
  return projectId
    ? `env:${tenantId}:${workspaceId}:project:${projectId}`
    : `env:${tenantId}:${workspaceId}`;
}

export function buildDeterministicProjectBinding(input: {
  projectId: string;
  workspaceId?: string;
  tenantId?: string;
}): { projectId: string; workspaceId: string; tenantId: string } {
  const projectId = normalize(input.projectId) || 'default-project';
  const workspaceId = normalize(input.workspaceId) || deterministicWorkspaceIdForProject(projectId);
  const tenantId = normalize(input.tenantId) || deterministicTenantIdForProject(projectId);
  return { projectId, workspaceId, tenantId };
}

export function validateRuntimeDomainSnapshot(snapshot: RuntimeDomainSnapshot): { ok: true } | { ok: false; reason: string } {
  const tenantSet = new Set(snapshot.tenants.map((t) => t.tenantId));
  const workspaceMap = new Map(snapshot.workspaces.map((w) => [w.workspaceId, w]));
  const projectSet = new Set(snapshot.projects.map((p) => p.projectId));

  for (const workspace of snapshot.workspaces) {
    if (!tenantSet.has(workspace.tenantId)) {
      return { ok: false, reason: `workspace_without_tenant:${workspace.workspaceId}` };
    }
  }

  for (const project of snapshot.projects) {
    const workspace = workspaceMap.get(project.workspaceId);
    if (!workspace) {
      return { ok: false, reason: `project_without_workspace:${project.projectId}` };
    }
    if (workspace.tenantId !== project.tenantId) {
      return { ok: false, reason: `project_tenant_mismatch:${project.projectId}` };
    }
  }

  for (const env of snapshot.environments) {
    const workspace = workspaceMap.get(env.workspaceId);
    if (!workspace) {
      return { ok: false, reason: `environment_without_workspace:${env.environmentId}` };
    }
    if (workspace.tenantId !== env.tenantId) {
      return { ok: false, reason: `environment_tenant_mismatch:${env.environmentId}` };
    }
    if (env.projectId && !projectSet.has(env.projectId)) {
      return { ok: false, reason: `environment_unknown_project:${env.environmentId}` };
    }
  }

  for (const user of snapshot.users) {
    const workspace = workspaceMap.get(user.defaultWorkspaceId);
    if (!workspace) {
      return { ok: false, reason: `user_without_workspace:${user.userId}` };
    }
    if (workspace.tenantId !== user.tenantId) {
      return { ok: false, reason: `user_tenant_mismatch:${user.userId}` };
    }
  }

  return { ok: true };
}
