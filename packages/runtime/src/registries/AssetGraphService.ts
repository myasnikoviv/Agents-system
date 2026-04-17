import { assetDependencyStore } from './AssetDependencyStore';

/**
 * AGSYS-3506 — Asset Graph Service
 * High-level operations on the asset dependency graph.
 */

export class AssetGraphService {
  private static instance: AssetGraphService;

  private constructor() {}

  static getInstance(): AssetGraphService {
    if (!this.instance) {
      this.instance = new AssetGraphService();
    }
    return this.instance;
  }

  /**
   * Performs an impact analysis: finds all assets that directly or indirectly 
   * depend on the given asset.
   */
  async getImpactList(assetId: string): Promise<string[]> {
    const impact = new Set<string>();
    const queue = [assetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = await assetDependencyStore.getIncoming(current);
      
      for (const dep of dependents) {
        if (!impact.has(dep.id)) {
          impact.add(dep.id);
          queue.push(dep.id);
        }
      }
    }

    return Array.from(impact);
  }

  /**
   * Resolves the full dependency tree for an asset.
   */
  async getDeepDependencies(assetId: string): Promise<string[]> {
    const deps = new Set<string>();
    const queue = [assetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependencies = await assetDependencyStore.getOutgoing(current);
      
      for (const d of dependencies) {
        if (!deps.has(d.id)) {
          deps.add(d.id);
          queue.push(d.id);
        }
      }
    }

    return Array.from(deps);
  }
}

export const assetGraphService = AssetGraphService.getInstance();
