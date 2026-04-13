import { 
  ManagedAsset, 
  generateAssetId,
  AssetType,
  CustomizationLevel
} from './AssetDomainModel';
import { assetStore } from './AssetStore';

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
}

export const assetPromotionService = AssetPromotionService.getInstance();
