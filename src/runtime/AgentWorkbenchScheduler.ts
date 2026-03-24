export type WorkbenchToolMode = 'isolated' | 'share-safe' | 'exclusive';

export interface WorkbenchTool {
  id: string;
  mode: WorkbenchToolMode;
  description: string;
}

export interface ToolLease {
  leaseId: string;
  toolId: string;
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
const leases = new Map<string, ToolLease[]>(); // key=toolId
const queues = new Map<string, QueueItem[]>(); // key=toolId

function makeLeaseId(toolId: string, owner: string): string {
  return `${toolId}:${owner}:${Date.now()}`;
}

function getLeases(toolId: string): ToolLease[] {
  return leases.get(toolId) || [];
}

function setLeases(toolId: string, next: ToolLease[]): void {
  leases.set(toolId, next);
}

function hasActiveLease(toolId: string, owner: string): ToolLease | undefined {
  return getLeases(toolId).find((l) => l.owner === owner);
}

function enqueueOwner(toolId: string, owner: string): number {
  const queue = queues.get(toolId) || [];
  if (queue.some((q) => q.owner === owner)) {
    return queue.findIndex((q) => q.owner === owner) + 1;
  }
  queue.push({ owner, requestedAt: new Date().toISOString() });
  queues.set(toolId, queue);
  return queue.length;
}

function dequeueNext(toolId: string): QueueItem | undefined {
  const queue = queues.get(toolId) || [];
  const next = queue.shift();
  queues.set(toolId, queue);
  return next;
}

export function listWorkbenchState() {
  return {
    tools: Array.from(tools.values()).map((tool) => ({
      ...tool,
      holders: getLeases(tool.id),
      queue: queues.get(tool.id) || [],
    })),
  };
}

export function acquireToolLease(toolId: string, owner: string): {
  status: 'acquired' | 'queued' | 'already_acquired' | 'not_found';
  lease?: ToolLease;
  queuePosition?: number;
  reason?: string;
} {
  const tool = tools.get(toolId);
  if (!tool) {
    return { status: 'not_found', reason: `tool_not_found:${toolId}` };
  }

  const existing = hasActiveLease(toolId, owner);
  if (existing) {
    return { status: 'already_acquired', lease: existing };
  }

  if (tool.mode === 'share-safe' || tool.mode === 'isolated') {
    const lease: ToolLease = {
      leaseId: makeLeaseId(toolId, owner),
      toolId,
      owner,
      acquiredAt: new Date().toISOString(),
    };
    setLeases(toolId, [...getLeases(toolId), lease]);
    return { status: 'acquired', lease };
  }

  const active = getLeases(toolId)[0];
  if (!active) {
    const lease: ToolLease = {
      leaseId: makeLeaseId(toolId, owner),
      toolId,
      owner,
      acquiredAt: new Date().toISOString(),
    };
    setLeases(toolId, [lease]);
    return { status: 'acquired', lease };
  }

  return { status: 'queued', queuePosition: enqueueOwner(toolId, owner) };
}

export function releaseToolLease(toolId: string, owner: string): {
  released: boolean;
  nextOwner?: string;
  queueLength?: number;
} {
  const activeLeases = getLeases(toolId);
  const idx = activeLeases.findIndex((l) => l.owner === owner);
  if (idx < 0) {
    return { released: false };
  }

  const nextLeases = [...activeLeases];
  nextLeases.splice(idx, 1);
  setLeases(toolId, nextLeases);

  const tool = tools.get(toolId);
  if (tool?.mode !== 'exclusive') {
    return { released: true, queueLength: (queues.get(toolId) || []).length };
  }

  if (nextLeases.length === 0) {
    const next = dequeueNext(toolId);
    if (next) {
      const lease: ToolLease = {
        leaseId: makeLeaseId(toolId, next.owner),
        toolId,
        owner: next.owner,
        acquiredAt: new Date().toISOString(),
      };
      setLeases(toolId, [lease]);
      return { released: true, nextOwner: next.owner, queueLength: (queues.get(toolId) || []).length };
    }
  }
  return { released: true, queueLength: (queues.get(toolId) || []).length };
}

export function cancelToolQueueRequest(toolId: string, owner: string): {
  cancelled: boolean;
  queueLength: number;
} {
  const queue = queues.get(toolId) || [];
  const before = queue.length;
  const filtered = queue.filter((q) => q.owner !== owner);
  queues.set(toolId, filtered);
  return { cancelled: filtered.length !== before, queueLength: filtered.length };
}

export function upsertWorkbenchTool(tool: WorkbenchTool): void {
  tools.set(tool.id, tool);
  if (!queues.has(tool.id)) queues.set(tool.id, []);
  if (!leases.has(tool.id)) leases.set(tool.id, []);
}

export function resetWorkbenchState(): void {
  tools.clear();
  leases.clear();
  queues.clear();
  for (const t of DEFAULT_TOOLS) {
    tools.set(t.id, t);
    leases.set(t.id, []);
    queues.set(t.id, []);
  }
}

resetWorkbenchState();
