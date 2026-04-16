"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RuntimeDomainModel_1 = require("../tenancy/RuntimeDomainModel");
describe('RuntimeDomainModel', () => {
    it('builds deterministic project -> workspace -> tenant mapping', () => {
        const binding = (0, RuntimeDomainModel_1.buildDeterministicProjectBinding)({ projectId: 'agent_system' });
        expect(binding).toEqual({
            projectId: 'agent_system',
            workspaceId: 'workspace:agent_system',
            tenantId: 'tenant:agent_system',
        });
    });
    it('builds deterministic environment identifiers', () => {
        const id = (0, RuntimeDomainModel_1.deterministicEnvironmentId)({
            tenantId: (0, RuntimeDomainModel_1.deterministicTenantIdForProject)('p1'),
            workspaceId: (0, RuntimeDomainModel_1.deterministicWorkspaceIdForProject)('p1'),
            projectId: 'p1',
        });
        expect(id).toBe('env:tenant:p1:workspace:p1:project:p1');
    });
    it('accepts a valid runtime domain snapshot', () => {
        const snapshot = {
            users: [{ userId: 'u1', tenantId: 't1', defaultWorkspaceId: 'w1', role: 'admin' }],
            tenants: [{ tenantId: 't1', slug: 'tenant-1', name: 'Tenant 1', active: true }],
            workspaces: [{ workspaceId: 'w1', tenantId: 't1', slug: 'ws-1', name: 'WS 1', active: true }],
            projects: [{ projectId: 'p1', workspaceId: 'w1', tenantId: 't1', slug: 'proj-1', name: 'Project 1' }],
            environments: [{ environmentId: 'e1', tenantId: 't1', workspaceId: 'w1', projectId: 'p1', state: 'active' }],
        };
        expect((0, RuntimeDomainModel_1.validateRuntimeDomainSnapshot)(snapshot).ok).toBe(true);
    });
    it('rejects cross-tenant project mismatch', () => {
        const snapshot = {
            users: [],
            tenants: [{ tenantId: 't1', slug: 'tenant-1', name: 'Tenant 1', active: true }],
            workspaces: [{ workspaceId: 'w1', tenantId: 't1', slug: 'ws-1', name: 'WS 1', active: true }],
            projects: [{ projectId: 'p1', workspaceId: 'w1', tenantId: 't2', slug: 'proj-1', name: 'Project 1' }],
            environments: [],
        };
        const result = (0, RuntimeDomainModel_1.validateRuntimeDomainSnapshot)(snapshot);
        expect(result.ok).toBe(false);
    });
});
