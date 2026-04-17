import fs from 'fs';
import path from 'path';

interface LlmCachePolicy {
  enabled?: boolean;
  ttlSeconds?: number;
  allowCriticalCache?: boolean;
}

interface CacheEntry {
  value: string;
  createdAt: number;
  expiresAt: number;
}

type CacheStore = Record<string, CacheEntry>;

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function loadPolicy(workspacePath: string): LlmCachePolicy {
  return readJson<LlmCachePolicy>(
    path.resolve(workspacePath, 'docs/runtime/adaptive/llm-cache-policy.json'),
    {
      enabled: true,
      ttlSeconds: 600,
      allowCriticalCache: false,
    },
  );
}

function cacheFile(workspacePath: string): string {
  return path.resolve(workspacePath, 'docs/process/runs/cache/llm-response-cache.json');
}

function loadStore(workspacePath: string): CacheStore {
  return readJson<CacheStore>(cacheFile(workspacePath), {});
}

function writeStore(workspacePath: string, store: CacheStore): void {
  const file = cacheFile(workspacePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8');
}

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildLlmResponseCacheKey(input: {
  pipelineId: string;
  stage: any;
  agentSlug: string;
  userInput: string;
}): string {
  const stageSignature = normalize(
    input.stage?.cacheKey ||
      input.stage?.prompt ||
      input.stage?.title ||
      input.stage?.name ||
      input.stage?.id ||
      '',
  );
  return `${normalize(input.pipelineId)}::${normalize(input.agentSlug)}::${stageSignature}::${normalize(input.userInput)}`;
}

export function getCachedLlmResponse(input: {
  workspacePath: string;
  key: string;
  stage: any;
  nowMs?: number;
}): { hit: boolean; value?: string } {
  const policy = loadPolicy(input.workspacePath);
  if (policy.enabled === false) return { hit: false };
  const isCritical = Boolean(input.stage?.critical === true);
  if (isCritical && !policy.allowCriticalCache) return { hit: false };

  const now = Number(input.nowMs || Date.now());
  const store = loadStore(input.workspacePath);
  const entry = store[input.key];
  if (!entry) return { hit: false };
  if (Number(entry.expiresAt || 0) <= now) return { hit: false };
  return { hit: true, value: String(entry.value || '') };
}

export function setCachedLlmResponse(input: {
  workspacePath: string;
  key: string;
  value: string;
  nowMs?: number;
}): void {
  const policy = loadPolicy(input.workspacePath);
  if (policy.enabled === false) return;
  const ttl = Math.max(1, Number(policy.ttlSeconds || 600));
  const now = Number(input.nowMs || Date.now());
  const store = loadStore(input.workspacePath);
  store[input.key] = {
    value: String(input.value || ''),
    createdAt: now,
    expiresAt: now + ttl * 1000,
  };
  writeStore(input.workspacePath, store);
}
