import fs from 'fs';
import path from 'path';

interface SemanticCachePolicy {
  enabled?: boolean;
  threshold?: number;
  ttlSeconds?: number;
  maxEntriesPerBucket?: number;
}

interface SemanticEntry {
  prompt: string;
  response: string;
  createdAt: number;
  expiresAt: number;
}

type SemanticStore = Record<string, SemanticEntry[]>;

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function normalize(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9_]+/i)
    .map((x) => x.trim())
    .filter(Boolean);
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const token of ta) {
    if (tb.has(token)) intersection += 1;
  }
  const union = ta.size + tb.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

function policyPath(workspacePath: string): string {
  return path.resolve(workspacePath, 'docs/runtime/adaptive/semantic-cache-policy.json');
}

function storePath(workspacePath: string): string {
  return path.resolve(workspacePath, 'docs/process/runs/cache/semantic-cache.json');
}

function loadPolicy(workspacePath: string): SemanticCachePolicy {
  return readJson<SemanticCachePolicy>(policyPath(workspacePath), {
    enabled: true,
    threshold: 0.75,
    ttlSeconds: 900,
    maxEntriesPerBucket: 50,
  });
}

function loadStore(workspacePath: string): SemanticStore {
  return readJson<SemanticStore>(storePath(workspacePath), {});
}

function writeStore(workspacePath: string, store: SemanticStore): void {
  const file = storePath(workspacePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf-8');
}

export function buildSemanticCacheBucket(input: {
  pipelineId: string;
  agentSlug: string;
  stage: any;
}): string {
  const stageSignature = normalize(
    input.stage?.semanticKey ||
      input.stage?.cacheKey ||
      input.stage?.prompt ||
      input.stage?.title ||
      input.stage?.name ||
      input.stage?.id ||
      '',
  );
  return `${normalize(input.pipelineId)}::${normalize(input.agentSlug)}::${stageSignature}`;
}

export function getSemanticCacheHit(input: {
  workspacePath: string;
  bucket: string;
  query: string;
  nowMs?: number;
}): { hit: boolean; response?: string; score?: number; threshold: number } {
  const policy = loadPolicy(input.workspacePath);
  const threshold = Math.max(0, Math.min(1, Number(policy.threshold ?? 0.75)));
  if (policy.enabled === false) return { hit: false, threshold };

  const now = Number(input.nowMs || Date.now());
  const store = loadStore(input.workspacePath);
  const rows = (store[input.bucket] || []).filter((row) => Number(row.expiresAt || 0) > now);
  if (rows.length === 0) return { hit: false, threshold };

  let best: { response: string; score: number } | null = null;
  for (const row of rows) {
    const score = jaccardSimilarity(input.query, row.prompt);
    if (!best || score > best.score) {
      best = { response: row.response, score };
    }
  }
  if (!best || best.score < threshold) return { hit: false, threshold };
  return { hit: true, response: best.response, score: best.score, threshold };
}

export function setSemanticCacheEntry(input: {
  workspacePath: string;
  bucket: string;
  prompt: string;
  response: string;
  nowMs?: number;
}): void {
  const policy = loadPolicy(input.workspacePath);
  if (policy.enabled === false) return;

  const ttl = Math.max(1, Number(policy.ttlSeconds || 900));
  const maxEntries = Math.max(1, Number(policy.maxEntriesPerBucket || 50));
  const now = Number(input.nowMs || Date.now());
  const store = loadStore(input.workspacePath);
  const existing = (store[input.bucket] || []).filter((row) => Number(row.expiresAt || 0) > now);
  existing.push({
    prompt: String(input.prompt || ''),
    response: String(input.response || ''),
    createdAt: now,
    expiresAt: now + ttl * 1000,
  });
  store[input.bucket] = existing.slice(-maxEntries);
  writeStore(input.workspacePath, store);
}
