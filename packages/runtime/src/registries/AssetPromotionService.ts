import * as fs from 'fs';
import * as path from 'path';
import { 
  ManagedAsset, 
  generateAssetId,
  AssetType,
  CustomizationLevel
} from './AssetDomainModel';
import { assetStore } from './AssetStore';
import { TemplateSerializer } from './TemplateSerializer';

/**
 * AGSYS-3504 — Asset Promotion Service
 * Logic for promoting workspace assets to system-wide templates.
 */

export class AssetPromotionService {
  private static instance: AssetPromotionService;

  private constructor() {}

  static getInstance(): AssetPromotionService {
    if (!this.instance) {
      this.instance = new AssetPromotionService();
    }
    return this.instance;
  }

  /**
   * Promotes an existing asset to a system template.
   */
  async promoteToTemplate(assetId: string): Promise<string> {
    const sourceAsset = await assetStore.get(assetId);
    if (!sourceAsset) {
      throw new Error(`Source asset ${assetId} not found.`);
    }

    // Define Template Context
    const templateContext = {
      tenant_id: 'system',
      workspace_id: 'global',
      project_id: 'system-templates',
      asset_type: 'template' as AssetType,
      slug: `template:${sourceAsset.identity.slug}`
    };

    const templateId = generateAssetId(templateContext);

    const templateAsset: ManagedAsset = {
      identity: {
        asset_id: templateId,
        ...templateContext
      },
      lineage: {
        source_template_id: sourceAsset.identity.asset_id, // Link to original
        customization_level: 'original' // The template itself is a source of truth
      },
      metadata: {
        ...sourceAsset.metadata,
        name: `Template: ${sourceAsset.metadata.name}`,
        status: 'active',
        approval_state: 'approved',
        tags: [...(sourceAsset.metadata.tags || []), 'template']
      },
      attributes: {
        ...sourceAsset.attributes,
        original_type: sourceAsset.identity.asset_type
      }
    };

    await assetStore.save(templateAsset);
    return templateId;
  }

  /**
   * AGSYS-3507 — Syncs a promoted template back to the filesystem.
   */
  async syncToFilesystem(templateId: string): Promise<string> {
    const asset = await assetStore.get(templateId);
    if (!asset || asset.identity.asset_type !== 'template') {
      throw new Error(`Asset ${templateId} is not a valid template to sync.`);
    }

    const markdown = TemplateSerializer.serialize(asset);
    
    // Determine Destination
    const originalType = asset.attributes.original_type as string;
    const slug = asset.identity.slug.replace('template:', ''); // Use base slug for file name
    
    let subDir = '';
    switch (originalType) {
      case 'agent': subDir = 'agents'; break;
      case 'skill': subDir = 'skills'; break;
      case 'pipeline': subDir = 'pipelines'; break;
      default: subDir = 'misc';
    }

    const targetDir = path.join(process.cwd(), 'generated', 'templates', subDir);
    const targetPath = path.join(targetDir, `${slug}.md`);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, markdown, 'utf-8');
    return targetPath;
  }
}

export const assetPromotionService = AssetPromotionService.getInstance();
