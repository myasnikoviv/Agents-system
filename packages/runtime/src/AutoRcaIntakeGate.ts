export type PlaneIssueLite = {
  id: string;
  name?: string;
  sequence_id?: number;
  state?: string;
};

export type PlaneStateLite = {
  id: string;
  group?: string;
  name?: string;
};

const MUTATING_PIPELINES = new Set([
  'new-feature',
  'feature-change',
  'bug-fix',
  'hotfix',
  'refactor',
]);

const FOLLOWUP_BYPASS_MARKERS = [
  /auto-rca/i,
  /follow[- ]?up/i,
  /root cause/i,
  /rca/i,
  /retro/i,
  /self[- ]?improvement/i,
  /improvement loop/i,
  /blocker/i,
  /fix (drift|gate|pipeline|ticket|guard)/i,
];

export function shouldGateByPipeline(pipelineId: string): boolean {
  return MUTATING_PIPELINES.has(String(pipelineId || '').trim());
}

export function shouldBypassAutoRcaGate(message: string): boolean {
  const m = String(message || '');
  return FOLLOWUP_BYPASS_MARKERS.some((re) => re.test(m));
}

export function filterUnresolvedAutoRcaIssues(issues: PlaneIssueLite[], states: PlaneStateLite[]): PlaneIssueLite[] {
  const stateGroup = new Map<string, string>();
  for (const s of states || []) {
    stateGroup.set(String(s.id), String(s.group || ''));
  }
  return (issues || []).filter((i) => {
    const name = String(i.name || '');
    if (!/auto-rca\s+follow-up/i.test(name)) return false;
    const group = stateGroup.get(String(i.state || '')) || '';
    return group !== 'completed' && group !== 'cancelled';
  });
}
