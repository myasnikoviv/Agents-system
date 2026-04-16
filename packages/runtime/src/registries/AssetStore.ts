import { ManagedAsset, AssetType } from './AssetDomainModel';
import { getRedisClient } from '../redisClient';

/**
 * AGSYS-3502 — Registry Schema & Store
 * High-performance, persistent registry for system assets.
 */

export interface AssetStore {
  save(asset: ManagedAsset): Promise<void>;
  get(assetId: string): Promise<ManagedAsset | null>;
  delete(assetId: string): Promise<void>;
  listByType(type: AssetType): Promise<ManagedAsset[]>;
  listByProject(projectId: string): Promise<ManagedAsset[]>;
}

export class RedisAssetStore implements AssetStore {
  private redis = getRedisClient();

  // Keys
  private assetKey(id: string) { return `asset:${id}`; }
  private typeIdxKey(type: string) { return `asset_idx:type:${type}`; }
  private projectIdxKey(projectId: string) { return `asset_idx:proj:${projectId}`; }
  private allIdxKey() { return `asset_idx:all`; }

  async save(asset: ManagedAsset): Promise<void> {
    const id = asset.identity.asset_id;
    const type = asset.identity.asset_type;
    const projId = asset.identity.project_id;

    const pipeline = this.redis.multi();
    
    // Store asset data
    pipeline.set(this.assetKey(id), JSON.stringify(asset));
    
    // Update indices
    pipeline.sadd(this.allIdxKey(), id);
    pipeline.sadd(this.typeIdxKey(type), id);
    pipeline.sadd(this.projectIdxKey(projId), id);

    await pipeline.exec();
  }

  async get(assetId: string): Promise<ManagedAsset | null> {
    const data = await this.redis.get(this.assetKey(assetId));
    if (!data) return null;
    return JSON.parse(data) as ManagedAsset;
  }

  async delete(assetId: string): Promise<void> {
    const asset = await this.get(assetId);
    if (!asset) return;

    const type = asset.identity.asset_type;
    const projId = asset.identity.project_id;

    const pipeline = this.redis.multi();
    
    pipeline.del(this.assetKey(assetId));
    pipeline.srem(this.allIdxKey(), assetId);
    pipeline.srem(this.typeIdxKey(type), assetId);
    pipeline.srem(this.projectIdxKey(projId), assetId);

    await pipeline.exec();
  }

  async listByType(type: AssetType): Promise<ManagedAsset[]> {
    const ids = await this.redis.smembers(this.typeIdxKey(type));
    return this.getMultiple(ids);
  }

  async listByProject(projectId: string): Promise<ManagedAsset[]> {
    const ids = await this.redis.smembers(this.projectIdxKey(projectId));
    return this.getMultiple(ids);
  }

  private async getMultiple(ids: string[]): Promise<ManagedAsset[]> {
    if (ids.length === 0) return [];
    
    const keys = ids.map(id => this.assetKey(id));
    const data = await this.redis.mget(keys);
    
    return data
      .filter((val): val is string => val !== null)
      .map(val => JSON.parse(val) as ManagedAsset);
  }
}

// Singleton for runtime use
export const assetStore = new RedisAssetStore();
