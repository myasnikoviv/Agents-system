import fs from 'fs';
import path from 'path';
import type { WorkbenchToolPolicy } from '../WorkbenchToolRegistry';

interface ToolCachePolicy {
  enabled?: boolean;
  ttlSeconds?: number;
  cacheableTools?: string[];
}

interface ToolCacheEntry {
  content: any;
  createdAt: number;
  expiresAt: number;
}

type ToolCacheStore = Record<string, ToolCacheEntry>;

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function policyPath(workspacePath: string): string {
  return path.resolve(workspacePath, 'docs/runtime/adaptive/tool-cache-policy.json');
}

function storePath(workspacePath: string): string {
  return path.resolve(workspacePath, 'docs/process/runs/cache/tool-result-cache.json');
}

function loadPolicy(workspacePath: string): ToolCachePolicy {
  return readJson<ToolCachePolicy>(policyPath(workspacePath), {
    enabled: true,
    ttlSeconds: 600,
    cacheableTools: ['ls', 'list_dir', 'read_file', 'search_web'],
  });
}

function loadStore(workspacePath: string): ToolCacheStore {
  return readJson<ToolCacheStore>(storePath(workspacePath), {});
}

function writeStore(workspacePath: string, store: ToolCacheStore): void {
  const file = storePath(workspacePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8');
}

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDeterministicToolCacheable(input: {
  workspacePath: string;
  toolId: string;
  policy?: WorkbenchToolPolicy;
}): boolean {
  const cachePolicy = loadPolicy(input.workspacePath);
  if (cachePolicy.enabled === false) return false;
  const byAllowlist = (cachePolicy.cacheableTools || []).includes(input.toolId);
  if (!byAllowlist) return false;
  // Safe tools are deterministic by default in this runtime profile.
  return String(input.policy?.risk || 'safe') === 'safe';
}

export function buildToolCacheKey(input: {
  toolId: string;
  args: any;
  tenantId?: string;
  workspaceId?: string;
  scopeLevel?: string;
}): string {
  const argsJson = JSON.stringify(input.args || {});
  return [
    normalize(input.scopeLevel || 'global'),
    normalize(input.tenantId || 'tenant:default'),
    normalize(input.workspaceId || 'workspace:default'),
    normalize(input.toolId),
    normalize(argsJson),
  ].join('::');
}

export function getToolResultFromCache(input: {
  workspacePath: string;
  key: string;
  nowMs?: number;
}): { hit: boolean; content?: any } {
  const now = Number(input.nowMs || Date.now());
  const store = loadStore(input.workspacePath);
  const row = store[input.key];
  if (!row) return { hit: false };
  if (Number(row.expiresAt || 0) <= now) return { hit: false };
  return { hit: true, content: row.content };
}

export function setToolResultToCache(input: {
  workspacePath: string;
  key: string;
  content: any;
  nowMs?: number;
}): void {
  const policy = loadPolicy(input.workspacePath);
  if (policy.enabled === false) return;
  const ttl = Math.max(1, Number(policy.ttlSeconds || 600));
  const now = Number(input.nowMs || Date.now());
  const store = loadStore(input.workspacePath);
  store[input.key] = {
    content: input.content,
    createdAt: now,
    expiresAt: now + ttl * 1000,
  };
  writeStore(input.workspacePath, store);
}
