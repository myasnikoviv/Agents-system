"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssetDomainModel_1 = require("../registries/AssetDomainModel");
describe('AssetDomainModel Identity', () => {
    const context = {
        tenant_id: 'tenant-123',
        workspace_id: 'ws-456',
        project_id: 'proj-789',
        asset_type: 'agent',
        slug: 'pm-orchestrator'
    };
    it('should generate a deterministic 16-character hex ID', () => {
        const id1 = (0, AssetDomainModel_1.generateAssetId)(context);
        const id2 = (0, AssetDomainModel_1.generateAssetId)(context);
        expect(id1).toBe(id2);
        expect(id1).toMatch(/^[a-f0-9]{16}$/);
    });
    it('should produce different IDs for different slugs', () => {
        const id1 = (0, AssetDomainModel_1.generateAssetId)(context);
        const id2 = (0, AssetDomainModel_1.generateAssetId)({ ...context, slug: 'researcher' });
        expect(id1).not.toBe(id2);
    });
    it('should produce different IDs for different asset types', () => {
        const id1 = (0, AssetDomainModel_1.generateAssetId)(context);
        const id2 = (0, AssetDomainModel_1.generateAssetId)({ ...context, asset_type: 'skill' });
        expect(id1).not.toBe(id2);
    });
    it('should produce different IDs for different projects', () => {
        const id1 = (0, AssetDomainModel_1.generateAssetId)(context);
        const id2 = (0, AssetDomainModel_1.generateAssetId)({ ...context, project_id: 'proj-ABC' });
        expect(id1).not.toBe(id2);
    });
    it('should remain stable across calls', () => {
        const id = (0, AssetDomainModel_1.generateAssetId)(context);
        // Known hash for this specific input to prevent accidental logic drift
        expect(id).toBe('dba1a9057de20ced');
    });
});
