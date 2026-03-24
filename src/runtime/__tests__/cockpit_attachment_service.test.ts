import { describe, expect, it } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { listCockpitAttachments, saveCockpitAttachment } from '../CockpitAttachmentService';

describe('CockpitAttachmentService', () => {
  it('stores uploaded attachment and returns it in registry list', async () => {
    const tmpDir = path.resolve(process.cwd(), 'uploads');
    await fs.mkdir(tmpDir, { recursive: true });
    const tempPath = path.resolve(tmpDir, `test-attachment-${Date.now()}.txt`);
    await fs.writeFile(tempPath, 'hello-attachment', 'utf-8');

    const saved = await saveCockpitAttachment({
      tempPath,
      originalName: 'sample.txt',
      mimeType: 'text/plain',
      size: 16,
      projectId: 'trade_bot',
      threadId: `thread-${Date.now()}`,
    });

    expect(saved.id).toBeTruthy();
    expect(saved.relativePath).toContain('docs/process/artifacts/attachments');
    expect(saved.originalName).toBe('sample.txt');

    const listed = await listCockpitAttachments({
      projectId: saved.projectId,
      threadId: saved.threadId,
    });
    expect(listed.items.length).toBe(1);
    expect(listed.items[0]?.id).toBe(saved.id);
  });
});
