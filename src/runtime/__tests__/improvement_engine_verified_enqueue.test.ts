jest.mock('../redisClient', () => ({
  getRedisClient: () => ({
    xadd: jest.fn(async () => 'job-1'),
  }),
}));

import fs from 'fs';
import os from 'os';
import path from 'path';
import { enqueueImprovementJob } from '../improvement/ImprovementEngine';

describe('ImprovementEngine verified enqueue', () => {
  it('enqueues improvement job when proposal is verified', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'improvement-verified-'));
    const proposalPath = path.join(workspace, 'proposal.json');
    fs.writeFileSync(
      proposalPath,
      JSON.stringify({ status: 'verified', verification: { status: 'verified', passed: true } }, null, 2),
      'utf-8',
    );

    const enqueued = await enqueueImprovementJob({
      runId: 'run-verified',
      projectId: 'proj-a',
      chainId: 'chain-verified',
      workspacePath: workspace,
      signalsPath: path.join(workspace, 'signals.json'),
      ticketsPath: path.join(workspace, 'tickets.json'),
      proposalPath,
    });

    expect(enqueued).toBe('job-1');
  });
});
