import fs from 'fs';
import path from 'path';
import { GovernanceRuleMetadata, GovernanceRuleScope } from './GovernanceEngineTypes';
import { resolveRuntimePath } from '@system/shared';

export type GovernanceLoopKind = 'improvement' | 'validation';

export interface GovernanceLoopEntity {
  id: string;
  kind: GovernanceLoopKind;
  enabledByDefault: boolean;
  disabled?: boolean;
  scope?: GovernanceRuleScope;
  metadata?: GovernanceRuleMetadata;
  config?: Record<string, unknown>;
}

interface GovernanceLoopCatalogFile {
  loops?: GovernanceLoopEntity[];
}

export class GovernanceLoopRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GovernanceLoopRegistryError';
  }
}

function catalogFile(workspacePath?: string): string {
  const root = workspacePath || process.cwd();
  return resolveRuntimePath(root, 'governanceLoopCatalogFile');
}

function normalizeLoops(input: GovernanceLoopEntity[]): GovernanceLoopEntity[] {
  const seen = new Set<string>();
  const now = new Date().toISOString();
  const normalized: GovernanceLoopEntity[] = [];
  for (const row of input) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    normalized.push({
      ...row,
      disabled: row.disabled === true,
      enabledByDefault: row.enabledByDefault !== false,
      scope: row.scope || { level: 'global' },
      metadata: {
        name: row.metadata?.name || row.id,
        description: row.metadata?.description || '',
        version: row.metadata?.version || '1.0.0',
        owner: row.metadata?.owner || 'system',
        tags: Array.isArray(row.metadata?.tags) ? row.metadata?.tags : [],
        createdAt: row.metadata?.createdAt || now,
        updatedAt: row.metadata?.updatedAt || now,
      } as GovernanceRuleMetadata,
    });
  }
  return normalized;
}

export function loadGovernanceLoopsFromDisk(workspacePath?: string): GovernanceLoopEntity[] {
  const filePath = catalogFile(workspacePath);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GovernanceLoopCatalogFile;
    return normalizeLoops(Array.isArray(raw?.loops) ? raw.loops : []);
  } catch {
    return [];
  }
}

function writeCatalog(loops: GovernanceLoopEntity[], workspacePath?: string): void {
  const filePath = catalogFile(workspacePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ loops: normalizeLoops(loops) }, null, 2), 'utf-8');
}

export function loadGovernanceLoops(workspacePath?: string): GovernanceLoopEntity[] {
  // AGSYS-35R: Source of Truth Enforcement (Synchronous Cache)
  const { assetRegistryV2 } = require('../registries/AssetRegistryV2');
  const fromRegistry = assetRegistryV2.listByTypeSync('loop');
  
  if (fromRegistry.length > 0) {
    return fromRegistry.map((asset: any) => asset.attributes as GovernanceLoopEntity);
  }
  
  // If registry is empty, we return empty list or throw if strictly required
  return [];
}

export function getGovernanceLoopById(loopId: string, workspacePath?: string): GovernanceLoopEntity | undefined {
  return loadGovernanceLoops(workspacePath).find((row) => row.id === loopId);
}

export function createGovernanceLoop(
  input: Omit<GovernanceLoopEntity, 'metadata'> & { metadata?: GovernanceLoopEntity['metadata'] },
  workspacePath?: string,
): GovernanceLoopEntity {
  const current = loadGovernanceLoops(workspacePath);
  if (current.some((row) => row.id === input.id)) {
    throw new GovernanceLoopRegistryError(`governance_loop_exists:${input.id}`);
  }
  const now = new Date().toISOString();
  const created: GovernanceLoopEntity = {
    ...input,
    enabledByDefault: input.enabledByDefault !== false,
    scope: input.scope || { level: 'global' },
    metadata: {
      name: input.metadata?.name || input.id,
      description: input.metadata?.description || '',
      version: input.metadata?.version || '1.0.0',
      owner: input.metadata?.owner || 'user',
      tags: Array.isArray(input.metadata?.tags) ? input.metadata?.tags : [],
      createdAt: input.metadata?.createdAt || now,
      updatedAt: now,
    } as GovernanceRuleMetadata,
  };
  writeCatalog([...current, created], workspacePath);
  return created;
}

export function updateGovernanceLoop(loopId: string, patch: Partial<GovernanceLoopEntity>, workspacePath?: string): GovernanceLoopEntity {
  const current = loadGovernanceLoops(workspacePath);
  const hit = current.find((row) => row.id === loopId);
  if (!hit) throw new GovernanceLoopRegistryError(`governance_loop_not_found:${loopId}`);
  const updated: GovernanceLoopEntity = {
    ...hit,
    ...patch,
    id: loopId,
    metadata: {
      ...(hit.metadata || {}),
      ...(patch.metadata || {}),
      updatedAt: new Date().toISOString(),
    } as GovernanceRuleMetadata,
  };
  writeCatalog(current.map((row) => (row.id === loopId ? updated : row)), workspacePath);
  return updated;
}

export function disableGovernanceLoop(loopId: string, params?: { disabled?: boolean }, workspacePath?: string): GovernanceLoopEntity {
  const disabled = params?.disabled !== false;
  return updateGovernanceLoop(loopId, { disabled }, workspacePath);
}

export function isGovernanceLoopRunnable(
  loop: GovernanceLoopEntity,
  input: { projectId: string; chainId: string },
): boolean {
  if (loop.disabled) return false;
  if (loop.scope?.level === 'project') {
    return !loop.scope.projectId || loop.scope.projectId === input.projectId;
  }
  if (loop.scope?.level === 'session') {
    const sameProject = !loop.scope.projectId || loop.scope.projectId === input.projectId;
    const sameSession = !loop.scope.sessionId || loop.scope.sessionId === input.chainId;
    return sameProject && sameSession;
  }
  return true;
}
