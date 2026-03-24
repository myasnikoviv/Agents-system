import { describe, expect, it } from '@jest/globals';
import { addEvidenceItem, readEvidenceItems } from '../EvidenceRegistryService';

describe('EvidenceRegistryService', () => {
  it('stores and reads image/artifact evidence entries', async () => {
    const ticket = `TEST-EVID-${Date.now()}`;
    await addEvidenceItem(ticket, {
      type: 'screenshot',
      path: '/tmp/screen.png',
      label: 'playwright-shot',
      createdAt: new Date().toISOString(),
    });
    const out = await readEvidenceItems(ticket);
    expect(out.items.length).toBe(1);
    expect(out.items[0]?.type).toBe('screenshot');
  });
});
