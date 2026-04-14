import * as fs from 'fs';
import * as path from 'path';
import { assetStore } from '../registries/AssetStore';
import { assetPromotionService } from '../registries/AssetPromotionService';
import { generateAssetId } from '../registries/AssetDomainModel';
import { MarkdownInterpreter } from '../interpreters/MarkdownInterpreter';

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
    const assetId = generateAssetId({
      tenant_id: 'test',
      workspace_id: 'ws',
      project_id: 'proj',
      asset_type: 'agent',
      slug: testSlug
    });

    await assetStore.save({
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
    const templateId = await assetPromotionService.promoteToTemplate(assetId);
    expect(templateId).toBeDefined();

    // 3. Sync to FS
    const syncedPath = await assetPromotionService.syncToFilesystem(templateId);
    expect(syncedPath).toContain(`${testSlug}.md`);
    expect(fs.existsSync(syncedPath)).toBe(true);

    // 4. Verify Content
    const content = fs.readFileSync(syncedPath, 'utf-8');
    expect(content).toContain('# Template: Sync Test Agent (template:sync-test-agent)');
    expect(content).toContain('## Mission');
    expect(content).toContain('Testing sync loop.');

    // 5. Verify Parsability
    const parsed = MarkdownInterpreter.parse(syncedPath);
    expect(parsed.metadata.name).toBe('Template: Sync Test Agent');
    expect(parsed.sections['Mission']).toBe('Testing sync loop.');
  });
});
