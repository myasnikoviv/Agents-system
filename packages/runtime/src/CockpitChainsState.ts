import fs from 'fs';
import path from 'path';

export type CockpitThreadEntry = { id: string; label: string; updatedAt: string };
export type CockpitChainsState = { threadsByProject: Record<string, CockpitThreadEntry[]> };

export function defaultChainsState(): CockpitChainsState {
  return {
    threadsByProject: {
      agent_system: [
        { id: 'current-session', label: 'Current Session', updatedAt: new Date().toISOString() },
        { id: 'ux-sprint-6', label: 'UX Sprint 6 Wave', updatedAt: new Date().toISOString() },
        { id: 'qa-gate', label: 'Final QA Gate', updatedAt: new Date().toISOString() },
      ],
      spark_keeper: [
        { id: 'kickoff', label: 'Kickoff Thread', updatedAt: new Date().toISOString() },
        { id: 'automation', label: 'Automation Notes', updatedAt: new Date().toISOString() },
      ],
    },
  };
}

export function loadChainsState(filePath: string, defaultValue: CockpitChainsState): CockpitChainsState {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const loaded = parsed?.threadsByProject;
    if (!loaded || typeof loaded !== 'object') return defaultValue;
    return { threadsByProject: loaded as Record<string, CockpitThreadEntry[]> };
  } catch {
    return defaultValue;
  }
}

export function persistChainsState(filePath: string, state: CockpitChainsState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
}
