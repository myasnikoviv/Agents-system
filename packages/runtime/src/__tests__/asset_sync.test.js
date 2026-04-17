"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const AssetStore_1 = require("../registries/AssetStore");
const AssetPromotionService_1 = require("../registries/AssetPromotionService");
const AssetDomainModel_1 = require("../registries/AssetDomainModel");
const MarkdownInterpreter_1 = require("../interpreters/MarkdownInterpreter");
/**
 * AGSYS-3507 — Filesystem Sync Test
 */
describe('Asset Filesystem Sync', () => {
    const testDir = path.join(process.cwd(), 'generated', 'templates', 'agents');
    const testSlug = 'sync-test-agent';
    const testPath = path.join(testDir, `${testSlug}.md`);
    beforeAll(() => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });
    afterAll(() => {
        if (fs.existsSync(testPath)) {
            fs.unlinkSync(testPath);
        }
    });
    it('should promote an asset and sync it to the filesystem', async () => {
        // 1. Create a workspace asset
        const assetId = (0, AssetDomainModel_1.generateAssetId)({
            tenant_id: 'test',
            workspace_id: 'ws',
            project_id: 'proj',
            asset_type: 'agent',
            slug: testSlug
        });
        await AssetStore_1.assetStore.save({
            identity: {
                asset_id: assetId,
                tenant_id: 'test',
                workspace_id: 'ws',
                project_id: 'proj',
                asset_type: 'agent',
                slug: testSlug
            },
            lineage: { customization_level: 'original' },
            metadata: {
                name: 'Sync Test Agent',
                version: '1.0.0',
                status: 'active',
                approval_state: 'approved',
                storage_ref: testPath
            },
            attributes: {
                mission: 'Testing sync loop.',
                persona: 'Automated Tester',
                instructions: 'Steps: 1. Promote. 2. Sync.'
            }
        });
        // 2. Promote to template
        const templateId = await AssetPromotionService_1.assetPromotionService.promoteToTemplate(assetId);
        expect(templateId).toBeDefined();
        // 3. Sync to FS
        const syncedPath = await AssetPromotionService_1.assetPromotionService.syncToFilesystem(templateId);
        expect(syncedPath).toContain(`${testSlug}.md`);
        expect(fs.existsSync(syncedPath)).toBe(true);
        // 4. Verify Content
        const content = fs.readFileSync(syncedPath, 'utf-8');
        expect(content).toContain('# Template: Sync Test Agent (template:sync-test-agent)');
        expect(content).toContain('## Mission');
        expect(content).toContain('Testing sync loop.');
        // 5. Verify Parsability
        const parsed = MarkdownInterpreter_1.MarkdownInterpreter.parse(syncedPath);
        expect(parsed.metadata.name).toBe('Template: Sync Test Agent');
        expect(parsed.sections['Mission']).toBe('Testing sync loop.');
    });
});
