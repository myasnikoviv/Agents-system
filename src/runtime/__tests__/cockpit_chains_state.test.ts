import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { defaultChainsState, loadChainsState, persistChainsState } from '../CockpitChainsState';

describe('CockpitChainsState', () => {
  it('falls back to defaults when file is missing', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cockpit-chains-'));
    const missing = path.join(tmp, 'missing.json');
    const defaultState = defaultChainsState();
    const loaded = loadChainsState(missing, defaultState);
    expect(Object.keys(loaded.threadsByProject)).toContain('agent_system');
  });

  it('persists and reloads state', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cockpit-chains-'));
    const file = path.join(tmp, 'state.json');
    const state = {
      threadsByProject: {
        agent_system: [{ id: 't1', label: 'Thread 1', updatedAt: '2026-03-22T00:00:00Z' }],
      },
    };
    persistChainsState(file, state);
    const loaded = loadChainsState(file, defaultChainsState());
    expect(loaded.threadsByProject.agent_system[0].id).toBe('t1');
  });
});
