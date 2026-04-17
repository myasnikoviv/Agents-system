export interface DependencyNode {
  id: string;
  dependsOn?: string[];
}

export interface DependencyPlanResult {
  ok: boolean;
  ordered: string[];
  blocked: string[];
  reason?: string;
}

export function buildDependencyPlan(nodes: DependencyNode[]): DependencyPlanResult {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const node of nodes) {
    for (const dep of node.dependsOn || []) {
      if (!byId.has(dep)) {
        return {
          ok: false,
          ordered: [],
          blocked: [node.id],
          reason: `missing_dependency:${dep}->${node.id}`,
        };
      }
      indegree.set(node.id, (indegree.get(node.id) || 0) + 1);
      outgoing.set(dep, [...(outgoing.get(dep) || []), node.id]);
    }
  }

  const queue = Array.from(indegree.entries())
    .filter(([, v]) => v === 0)
    .map(([id]) => id);
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    ordered.push(current);
    for (const next of outgoing.get(current) || []) {
      const remaining = (indegree.get(next) || 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  if (ordered.length !== nodes.length) {
    const blocked = Array.from(indegree.entries())
      .filter(([, v]) => v > 0)
      .map(([id]) => id);
    return { ok: false, ordered, blocked, reason: 'dependency_cycle_detected' };
  }

  return { ok: true, ordered, blocked: [] };
}

