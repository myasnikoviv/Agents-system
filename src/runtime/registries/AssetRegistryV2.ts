import { 
  ManagedAsset, 
  AssetType, 
  AssetStatus, 
  AssetApprovalState, 
  generateAssetId, 
  AssetIdentity,
  AssetLineage,
  AssetMetadata,
  AssetProjectContext
} from './AssetDomainModel';
import { assetStore } from './AssetStore';
import { assetPromotionService } from './AssetPromotionService';
import { assetDependencyStore } from './AssetDependencyStore';
import { assetGraphService } from './AssetGraphService';
import { AgentRegistry } from './AgentRegistry';
import { SkillRegistry } from './SkillRegistry';
import { PipelineRegistry } from './PipelineRegistry';
import { DynamicDiscoveryService } from '../DynamicDiscoveryService';

/**
 * AGSYS-3503 — Asset Registry Service
 * The primary orchestration layer for system assets.
 */

export class AssetRegistryV2 {
  private static instance: AssetRegistryV2;

  private constructor() {}

  static getInstance(): AssetRegistryV2 {
    if (!this.instance) {
      this.instance = new AssetRegistryV2();
    }
    return this.instance;
  }

  /**
   * Promotes an existing asset to a system template (AGSYS-3504).
   */
  async promote(assetId: string): Promise<string> {
    return assetPromotionService.promoteToTemplate(assetId);
  }

  /**
   * Creates a forked asset from a template (AGSYS-3505).
   */
  async fork(templateId: string, context: {
    tenantId: string;
    workspaceId: string;
    projectId: string;
    slug: string;
  }): Promise<string> {
    const template = await assetStore.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found.`);
    }

    const type = template.attributes.original_type || 'agent';
    const assetId = generateAssetId({
      tenant_id: context.tenantId,
      workspace_id: context.workspaceId,
      project_id: context.projectId,
      asset_type: type,
      slug: context.slug
    });

    const forkedAsset: ManagedAsset = {
      identity: {
        asset_id: assetId,
        asset_type: type,
        slug: context.slug,
        tenant_id: context.tenantId,
        workspace_id: context.workspaceId,
        project_id: context.projectId
      },
      lineage: {
        source_template_id: templateId,
        source_template_version: template.metadata.version,
        customization_level: 'fork'
      },
      metadata: {
        ...template.metadata,
        name: context.slug, // Default name to slug for the fork
        status: 'registered',
        approval_state: 'pending',
        tags: [...(template.metadata.tags || []), 'fork']
      },
      attributes: { ...template.attributes }
    };

    await assetStore.save(forkedAsset);
    return assetId;
  }

  /**
   * Returns direct dependencies of an asset.
   */
  async getDependencies(assetId: string) {
    return assetDependencyStore.getOutgoing(assetId);
  }

  /**
   * Returns true if the registry has been hydrated (at least one agent present).
   */
  isHydrated(): boolean {
    return AgentRegistry.getAllAgents().length > 0;
  }

  /**
   * AGSYS-3508 — Registry Initialization (V2)
   * Rehydrates legacy in-memory registries from the persistent Redis store.
   */
  async initialize(context?: AssetProjectContext): Promise<void> {
    const ctx = context || {
      tenant_id: process.env.TENANT_ID || 'default',
      workspace_id: process.env.WORKSPACE_ID || 'default',
      project_id: process.env.PROJECT_ID || 'default'
    };

    // 1. Fetch all project assets
    const assets = await assetStore.listByProject(ctx.project_id);
    
    // 2. Fetch shared templates/constants
    const templates = await assetStore.listByProject('system-templates');
    
    const allKnownAssets = [...assets, ...templates];

    if (allKnownAssets.length === 0) {
      console.log('[AssetRegistryV2] Registry empty. Triggering discovery...');
      const root = process.cwd();
      await DynamicDiscoveryService.discoverAll(root);
      return;
    }

    // 3. Populate Legacy Registries
    for (const asset of allKnownAssets) {
      const { asset_type, slug } = asset.identity;
      const profile = { ...asset.attributes, assetId: asset.identity.asset_id, projectId: asset.identity.project_id } as any;

      try {
        switch (asset_type) {
          case 'agent':
            AgentRegistry.register(profile);
            break;
          case 'skill':
            SkillRegistry.register(profile);
            break;
          case 'pipeline':
            PipelineRegistry.register(profile);
            break;
        }
      } catch (e) {
        console.warn(`[AssetRegistryV2] Failed to rehydrate asset ${slug}:`, e);
      }
    }
  }

  /**
   * Returns deep impact list (all assets that depend on this one).
   */
  async getImpactList(assetId: string) {
    return assetGraphService.getImpactList(assetId);
  }

  /**
   * Registers or updates an asset in the persistent registry.
   */
  async registerAsset(params: {
    type: AssetType;
    slug: string;
    path: string;
    name: string;
    version?: string;
    tenantId?: string;
    workspaceId?: string;
    projectId?: string;
    metadata?: Partial<AssetMetadata>;
    attributes?: Record<string, any>;
    lineage?: Partial<AssetLineage>;
  }): Promise<string> {
    const tenantId = params.tenantId || 'system';
    const workspaceId = params.workspaceId || 'default';
    const projectId = params.projectId || 'default';
    
    const assetId = generateAssetId({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      project_id: projectId,
      asset_type: params.type,
      slug: params.slug
    });

    // 1. Clear old dependencies if re-registering
    await assetDependencyStore.clearOutgoing(assetId);

    const asset: ManagedAsset = {
      identity: {
        asset_id: assetId,
        asset_type: params.type,
        slug: params.slug,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        project_id: projectId
      },
      lineage: {
        customization_level: params.lineage?.customization_level || 'original',
        ...params.lineage
      },
      metadata: {
        name: params.name,
        version: params.version || '1.0.0',
        status: params.metadata?.status || 'discovered',
        approval_state: params.metadata?.approval_state || 'pending',
        storage_ref: params.path,
        ...params.metadata
      },
      attributes: params.attributes || {}
    };

    await assetStore.save(asset);

    // 2. Automated Dependency Resolution
    // Currently supports Agent -> Skills and Agent -> Tools
    if (params.type === 'agent' && params.attributes) {
      const attr = params.attributes;
      
      // Resolve Skills
      if (attr.skills && Array.isArray(attr.skills)) {
        for (const skillSlug of attr.skills) {
          const targetId = generateAssetId({
            tenant_id: tenantId,
            workspace_id: workspaceId,
            project_id: projectId,
            asset_type: 'skill',
            slug: skillSlug
          });
          await assetDependencyStore.addDependency(assetId, targetId, 'uses_skill');
        }
      }

      // Resolve Tools
      if (attr.tools && Array.isArray(attr.tools)) {
        for (const toolSlug of attr.tools) {
          const targetId = generateAssetId({
            tenant_id: tenantId,
            workspace_id: workspaceId,
            project_id: projectId,
            asset_type: 'skill', // Tools are mapped as skills
            slug: toolSlug
          });
          await assetDependencyStore.addDependency(assetId, targetId, 'uses_tool');
        }
      }
    }

    return assetId;
  }

  async getAsset(assetId: string): Promise<ManagedAsset | null> {
    return assetStore.get(assetId);
  }

  async listByType(type: AssetType): Promise<ManagedAsset[]> {
    return assetStore.listByType(type);
  }

  async listByProject(projectId: string): Promise<ManagedAsset[]> {
    return assetStore.listByProject(projectId);
  }
}

export const assetRegistryV2 = AssetRegistryV2.getInstance();
