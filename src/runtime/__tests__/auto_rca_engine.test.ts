import { describe, expect, it } from '@jest/globals';
import { runAutoRca } from '../AutoRcaEngine';

describe('AutoRcaEngine', () => {
  it('triggers on failure signals', async () => {
    const out = await runAutoRca({
      ticketId: `TEST-RCA-${Date.now()}`,
      pipelineId: 'feature-change',
      qualityScore: 92,
      logs: ['[status:error] tool failed'],
    });
    expect(out.triggered).toBe(true);
    expect(out.artifactPath).toBeTruthy();
  });

  it('does not trigger when healthy', async () => {
    const out = await runAutoRca({
      ticketId: `TEST-RCA-${Date.now()}-OK`,
      pipelineId: 'feature-change',
      qualityScore: 95,
      logs: ['all good'],
    });
    expect(out.triggered).toBe(false);
  });
});
