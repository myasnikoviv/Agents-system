import { getRedisClient } from '../redisClient';

/**
 * AGSYS-3506 — Asset Dependency Store
 * Implements a directed graph in Redis using Sets.
 */

export class AssetDependencyStore {
  private static instance: AssetDependencyStore;
  private redis = getRedisClient();

  private constructor() {}

  static getInstance(): AssetDependencyStore {
    if (!this.instance) {
      this.instance = new AssetDependencyStore();
    }
    return this.instance;
  }

  private getOutKey(sourceId: string): string {
    return `asset_deps:out:${sourceId}`;
  }

  private getInKey(targetId: string): string {
    return `asset_deps:in:${targetId}`;
  }

  /**
   * Adds a bi-directional dependency link.
   * Format: "type:targetId" or "type:sourceId"
   */
  async addDependency(sourceId: string, targetId: string, type: string): Promise<void> {
    const multi = this.redis.multi();
    multi.sadd(this.getOutKey(sourceId), `${type}:${targetId}`);
    multi.sadd(this.getInKey(targetId), `${type}:${sourceId}`);
    await multi.exec();
  }

  /**
   * Removes a dependency link.
   */
  async removeDependency(sourceId: string, targetId: string, type: string): Promise<void> {
    const multi = this.redis.multi();
    multi.srem(this.getOutKey(sourceId), `${type}:${targetId}`);
    multi.srem(this.getInKey(targetId), `${type}:${sourceId}`);
    await multi.exec();
  }

  /**
   * Returns all outgoing dependencies for an asset.
   */
  async getOutgoing(sourceId: string): Promise<{ type: string; id: string }[]> {
    const members = await this.redis.smembers(this.getOutKey(sourceId));
    return this.parseMembers(members);
  }

  /**
   * Returns all incoming dependents for an asset.
   */
  async getIncoming(targetId: string): Promise<{ type: string; id: string }[]> {
    const members = await this.redis.smembers(this.getInKey(targetId));
    return this.parseMembers(members);
  }

  private parseMembers(members: string[]): { type: string; id: string }[] {
    return members.map(m => {
      const [type, ...rest] = m.split(':');
      return { type, id: rest.join(':') };
    });
  }

  /**
   * Clears all dependencies for a source asset (e.g. before re-discovery).
   */
  async clearOutgoing(sourceId: string): Promise<void> {
    const outgoing = await this.getOutgoing(sourceId);
    if (outgoing.length === 0) return;

    const multi = redisClient.multi();
    for (const dep of outgoing) {
      multi.srem(this.getInKey(dep.id), `${dep.type}:${sourceId}`);
    }
    multi.del(this.getOutKey(sourceId));
    await multi.exec();
  }
}

export const assetDependencyStore = AssetDependencyStore.getInstance();
