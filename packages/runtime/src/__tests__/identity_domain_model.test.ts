import { validateIdentityDomainSnapshot, type IdentityDomainSnapshot } from '../identity/IdentityDomainModel';

function validSnapshot(): IdentityDomainSnapshot {
  return {
    users: [{ id: 'u-1', email: 'user@example.com', status: 'active' }],
    tenants: [{ id: 't-1', name: 'Tenant 1', active: true }],
    workspaces: [{ id: 'w-1', tenantId: 't-1', name: 'Workspace 1', active: true }],
    memberships: [
      {
        id: 'm-1',
        userId: 'u-1',
        tenantId: 't-1',
        workspaceId: 'w-1',
        role: 'owner',
        active: true,
      },
    ],
  };
}

describe('IdentityDomainModel', () => {
  it('accepts valid strict relationships between user, tenant, workspace and membership', () => {
    const result = validateIdentityDomainSnapshot(validSnapshot());
    expect(result).toEqual({ ok: true });
  });

  it('rejects workspace without existing tenant', () => {
    const snapshot = validSnapshot();
    snapshot.workspaces[0]!.tenantId = 't-missing';
    const result = validateIdentityDomainSnapshot(snapshot);
    expect(result).toEqual({ ok: false, reason: 'workspace_without_tenant:w-1' });
  });

  it('rejects membership tenant/workspace mismatch', () => {
    const snapshot = validSnapshot();
    snapshot.tenants.push({ id: 't-2', name: 'Tenant 2', active: true });
    snapshot.memberships[0]!.tenantId = 't-2';
    const result = validateIdentityDomainSnapshot(snapshot);
    expect(result).toEqual({ ok: false, reason: 'membership_tenant_mismatch:m-1' });
  });

  it('rejects invalid user email', () => {
    const snapshot = validSnapshot();
    snapshot.users[0]!.email = 'not-an-email';
    const result = validateIdentityDomainSnapshot(snapshot);
    expect(result).toEqual({ ok: false, reason: 'user_invalid_email:u-1' });
  });
});
