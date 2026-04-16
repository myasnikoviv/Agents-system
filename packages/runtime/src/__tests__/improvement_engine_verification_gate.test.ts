import fs from 'fs';
import os from 'os';
import path from 'path';
import { enqueueImprovementJob } from '../improvement/ImprovementEngine';

describe('ImprovementEngine verification gate', () => {
  it('does not enqueue improvement job when proposal is not verified', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'improvement-gate-'));
    const proposalPath = path.join(workspace, 'proposal.json');
    fs.writeFileSync(
      proposalPath,
      JSON.stringify({ status: 'proposed', verification: { status: 'pending', passed: false } }, null, 2),
      'utf-8',
    );

    const enqueued = await enqueueImprovementJob({
      runId: 'run-1',
      projectId: 'proj-a',
      chainId: 'chain-1',
      workspacePath: workspace,
      signalsPath: path.join(workspace, 'signals.json'),
      ticketsPath: path.join(workspace, 'tickets.json'),
      proposalPath,
    });

    expect(enqueued).toBeNull();
  });
});
