export type IdentityUserStatus = 'active' | 'invited' | 'suspended' | 'disabled';

export interface IdentityUser {
  id: string;
  email: string;
  status: IdentityUserStatus;
}

export interface IdentityTenant {
  id: string;
  name: string;
  active: boolean;
}

export interface IdentityWorkspace {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
}

export type IdentityRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface IdentityMembership {
  id: string;
  userId: string;
  tenantId: string;
  workspaceId: string;
  role: IdentityRole;
  active: boolean;
}

export interface IdentityDomainSnapshot {
  users: IdentityUser[];
  tenants: IdentityTenant[];
  workspaces: IdentityWorkspace[];
  memberships: IdentityMembership[];
}

export type IdentityValidationResult = { ok: true } | { ok: false; reason: string };

function isEmail(value: string): boolean {
  const normalized = String(value || '').trim();
  return normalized.includes('@') && normalized.includes('.');
}

export function validateIdentityDomainSnapshot(snapshot: IdentityDomainSnapshot): IdentityValidationResult {
  const userIds = new Set(snapshot.users.map((user) => user.id));
  const tenantIds = new Set(snapshot.tenants.map((tenant) => tenant.id));
  const workspaceById = new Map(snapshot.workspaces.map((workspace) => [workspace.id, workspace]));

  for (const user of snapshot.users) {
    if (!user.id) {
      return { ok: false, reason: 'user_missing_id' };
    }
    if (!isEmail(user.email)) {
      return { ok: false, reason: `user_invalid_email:${user.id}` };
    }
  }

  for (const workspace of snapshot.workspaces) {
    if (!tenantIds.has(workspace.tenantId)) {
      return { ok: false, reason: `workspace_without_tenant:${workspace.id}` };
    }
  }

  for (const membership of snapshot.memberships) {
    if (!userIds.has(membership.userId)) {
      return { ok: false, reason: `membership_unknown_user:${membership.id}` };
    }
    if (!tenantIds.has(membership.tenantId)) {
      return { ok: false, reason: `membership_unknown_tenant:${membership.id}` };
    }
    const workspace = workspaceById.get(membership.workspaceId);
    if (!workspace) {
      return { ok: false, reason: `membership_unknown_workspace:${membership.id}` };
    }
    if (workspace.tenantId !== membership.tenantId) {
      return { ok: false, reason: `membership_tenant_mismatch:${membership.id}` };
    }
  }

  return { ok: true };
}
