export type WorkbenchToolMode = 'isolated' | 'share-safe' | 'exclusive';

export interface WorkbenchTool {
  id: string;
  mode: WorkbenchToolMode;
  description: string;
}

export interface ToolLease {
  leaseId: string;
  toolId: string;
  scopeKey: string;
  owner: string;
  acquiredAt: string;
}

type QueueItem = {
  owner: string;
  requestedAt: string;
};

const DEFAULT_TOOLS: WorkbenchTool[] = [
  { id: 'playwright', mode: 'isolated', description: 'UI verification in isolated target environment' },
  { id: 'figma', mode: 'exclusive', description: 'Design MCP with exclusive lock requirement' },
  { id: 'plane', mode: 'share-safe', description: 'Ticketing API with concurrent-safe operations' },
  { id: 'filesystem', mode: 'exclusive', description: 'Mutating IO operations requiring single owner' },
];

const tools = new Map<string, WorkbenchTool>(DEFAULT_TOOLS.map((t) => [t.id, t] as const));
const leases = new Map<string, ToolLease[]>(); // key=toolId::scope
const queues = new Map<string, QueueItem[]>(); // key=toolId::scope

function storageKey(toolId: string, scopeKey?: string): string {
  const scope = String(scopeKey || 'global').trim() || 'global';
  return `${toolId}::${scope}`;
}

function makeLeaseId(toolId: string, owner: string): string {
  return `${toolId}:${owner}:${Date.now()}`;
}

function getLeases(toolId: string, scopeKey?: string): ToolLease[] {
  return leases.get(storageKey(toolId, scopeKey)) || [];
}

function setLeases(toolId: string, next: ToolLease[], scopeKey?: string): void {
  leases.set(storageKey(toolId, scopeKey), next);
}

function hasActiveLease(toolId: string, owner: string, scopeKey?: string): ToolLease | undefined {
  return getLeases(toolId, scopeKey).find((l) => l.owner === owner);
}

function enqueueOwner(toolId: string, owner: string, scopeKey?: string): number {
  const key = storageKey(toolId, scopeKey);
  const queue = queues.get(key) || [];
  if (queue.some((q) => q.owner === owner)) {
    return queue.findIndex((q) => q.owner === owner) + 1;
  }
  queue.push({ owner, requestedAt: new Date().toISOString() });
  queues.set(key, queue);
  return queue.length;
}

function dequeueNext(toolId: string, scopeKey?: string): QueueItem | undefined {
  const key = storageKey(toolId, scopeKey);
  const queue = queues.get(key) || [];
  const next = queue.shift();
  queues.set(key, queue);
  return next;
}

export function listWorkbenchState() {
  return {
    tools: Array.from(tools.values()).map((tool) => ({
      ...tool,
      holders: Array.from(leases.entries())
        .filter(([k]) => k.startsWith(`${tool.id}::`))
        .flatMap(([, items]) => items),
      queue: Array.from(queues.entries())
        .filter(([k]) => k.startsWith(`${tool.id}::`))
        .flatMap(([, items]) => items),
    })),
  };
}

export function acquireToolLease(toolId: string, owner: string, scopeKey?: string): {
  status: 'acquired' | 'queued' | 'already_acquired' | 'not_found';
  lease?: ToolLease;
  queuePosition?: number;
  reason?: string;
} {
  const tool = tools.get(toolId);
  if (!tool) {
    return { status: 'not_found', reason: `tool_not_found:${toolId}` };
  }

  const existing = hasActiveLease(toolId, owner, scopeKey);
  if (existing) {
    return { status: 'already_acquired', lease: existing };
  }

  if (tool.mode === 'share-safe' || tool.mode === 'isolated') {
    const lease: ToolLease = {
      leaseId: makeLeaseId(toolId, owner),
      toolId,
      scopeKey: String(scopeKey || 'global'),
      owner,
      acquiredAt: new Date().toISOString(),
    };
    setLeases(toolId, [...getLeases(toolId, scopeKey), lease], scopeKey);
    return { status: 'acquired', lease };
  }

  const active = getLeases(toolId, scopeKey)[0];
  if (!active) {
    const lease: ToolLease = {
      leaseId: makeLeaseId(toolId, owner),
      toolId,
      scopeKey: String(scopeKey || 'global'),
      owner,
      acquiredAt: new Date().toISOString(),
    };
    setLeases(toolId, [lease], scopeKey);
    return { status: 'acquired', lease };
  }

  return { status: 'queued', queuePosition: enqueueOwner(toolId, owner, scopeKey) };
}

export function releaseToolLease(toolId: string, owner: string, scopeKey?: string): {
  released: boolean;
  nextOwner?: string;
  queueLength?: number;
} {
  const activeLeases = getLeases(toolId, scopeKey);
  const idx = activeLeases.findIndex((l) => l.owner === owner);
  if (idx < 0) {
    return { released: false };
  }

  const nextLeases = [...activeLeases];
  nextLeases.splice(idx, 1);
  setLeases(toolId, nextLeases, scopeKey);

  const tool = tools.get(toolId);
  if (tool?.mode !== 'exclusive') {
    return { released: true, queueLength: (queues.get(storageKey(toolId, scopeKey)) || []).length };
  }

  if (nextLeases.length === 0) {
    const next = dequeueNext(toolId, scopeKey);
    if (next) {
      const lease: ToolLease = {
        leaseId: makeLeaseId(toolId, next.owner),
        toolId,
        scopeKey: String(scopeKey || 'global'),
        owner: next.owner,
        acquiredAt: new Date().toISOString(),
      };
      setLeases(toolId, [lease], scopeKey);
      return { released: true, nextOwner: next.owner, queueLength: (queues.get(storageKey(toolId, scopeKey)) || []).length };
    }
  }
  return { released: true, queueLength: (queues.get(storageKey(toolId, scopeKey)) || []).length };
}

export function cancelToolQueueRequest(toolId: string, owner: string): {
  cancelled: boolean;
  queueLength: number;
} {
  const queue = queues.get(storageKey(toolId)) || [];
  const before = queue.length;
  const filtered = queue.filter((q) => q.owner !== owner);
  queues.set(storageKey(toolId), filtered);
  return { cancelled: filtered.length !== before, queueLength: filtered.length };
}

export function upsertWorkbenchTool(tool: WorkbenchTool): void {
  tools.set(tool.id, tool);
}

export function resetWorkbenchState(): void {
  tools.clear();
  leases.clear();
  queues.clear();
  for (const t of DEFAULT_TOOLS) {
    tools.set(t.id, t);
  }
}

resetWorkbenchState();
