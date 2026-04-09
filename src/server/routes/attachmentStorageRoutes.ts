import type express from 'express';

interface AttachmentStorageRouteDeps {
  objectStorageList: (input: { bucket?: string; projectId?: string; threadId?: string; limit?: number }) => Promise<any[]>;
  objectStorageGet: (id: string) => Promise<any | null>;
  objectStoragePut: (input: {
    bucket: string;
    key?: string;
    projectId: string;
    threadId: string;
    mimeType: string;
    contentBase64: string;
    metadata?: Record<string, any>;
  }) => Promise<any>;
  appendControlActionAudit: (entry: {
    action: string;
    projectId?: string;
    actorId?: string;
    target?: Record<string, any>;
    result?: Record<string, any>;
  }) => void;
}

export function registerAttachmentStorageRoutes(app: express.Express, deps: AttachmentStorageRouteDeps): void {
  app.post('/api/cockpit/attachments/upload', async (req, res) => {
    const body = req.body || {};
    const projectId = String(body.projectId || '').trim() || 'default';
    const threadId = String(body.threadId || '').trim() || 'default';
    const files = Array.isArray(body.files) ? body.files : [];

    if (!projectId || !threadId) {
      return res.status(400).json({ success: false, error: 'project_and_thread_required' });
    }
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'files_required' });
    }

    const uploadedRaw = await Promise.all(files.map(async (file: any, idx: number) => {
        const contentBase64 = String(file.contentBase64 || '').trim();
        if (!contentBase64) return null;
        const originalName = String(file.originalName || file.name || '').trim() || `attachment-${idx + 1}`;
        const stored = await deps.objectStoragePut({
          bucket: 'attachments',
          key: `${projectId}/${threadId}/${originalName}`,
          projectId,
          threadId,
          mimeType: String(file.mimeType || 'application/octet-stream'),
          contentBase64,
          metadata: {
            originalName,
            source: 'cockpit-upload',
            uploadedBy: String(body.actorId || 'cockpit-user'),
          },
        });
        return {
          id: stored.id,
          bucket: stored.bucket,
          key: stored.key,
          mimeType: stored.mimeType,
          size: stored.size,
          checksumSha256: stored.checksumSha256,
          createdAt: stored.createdAt,
          originalName,
        };
      }));
    const uploaded = uploadedRaw.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (uploaded.length === 0) {
      return res.status(400).json({ success: false, error: 'valid_files_required' });
    }

    deps.appendControlActionAudit({
      action: 'cockpit.attachments.upload',
      projectId,
      actorId: String(body.actorId || 'cockpit-user'),
      target: { threadId, count: uploaded.length },
      result: { objectIds: uploaded.map((u) => u.id) },
    });

    return res.json({
      success: true,
      uploaded,
      storage: { provider: 'object-storage-service', bucket: 'attachments' },
    });
  });

  app.get('/api/cockpit/attachments', async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : '';
    const threadId = typeof req.query.threadId === 'string' ? req.query.threadId.trim() : '';
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const items = await deps.objectStorageList({
      bucket: 'attachments',
      projectId: projectId || undefined,
      threadId: threadId || undefined,
      limit,
    });
    return res.json({ success: true, items });
  });

  app.get('/api/cockpit/attachments/:id', async (req, res) => {
    const item = await deps.objectStorageGet(String(req.params.id || '').trim());
    if (!item || item.bucket !== 'attachments') {
      return res.status(404).json({ success: false, error: 'attachment_not_found' });
    }
    return res.json({ success: true, item });
  });

  app.get('/api/cockpit/attachments/:id/content', async (req, res) => {
    const item = await deps.objectStorageGet(String(req.params.id || '').trim());
    if (!item || item.bucket !== 'attachments') {
      return res.status(404).json({ success: false, error: 'attachment_not_found' });
    }
    const bytes = Buffer.from(item.contentBase64, 'base64');
    res.setHeader('content-type', item.mimeType || 'application/octet-stream');
    res.setHeader('content-length', String(bytes.length));
    return res.send(bytes);
  });

  app.get('/api/cockpit/storage/objects', async (req, res) => {
    const bucket = typeof req.query.bucket === 'string' ? req.query.bucket.trim() : undefined;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : undefined;
    const threadId = typeof req.query.threadId === 'string' ? req.query.threadId.trim() : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const items = await deps.objectStorageList({ bucket, projectId, threadId, limit });
    return res.json({ success: true, items });
  });

  app.get('/api/cockpit/storage/objects/:id', async (req, res) => {
    const item = await deps.objectStorageGet(String(req.params.id || '').trim());
    if (!item) {
      return res.status(404).json({ success: false, error: 'object_not_found' });
    }
    return res.json({ success: true, item });
  });
}
