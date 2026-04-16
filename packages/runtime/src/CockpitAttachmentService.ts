import fs from 'fs/promises';
import path from 'path';

export interface CockpitAttachmentMeta {
  id: string;
  originalName: string;
  storedPath: string;
  relativePath: string;
  mimeType: string;
  size: number;
  threadId: string;
  projectId: string;
  createdAt: string;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'unknown';
}

function buildThreadDir(projectId: string, threadId: string): string {
  return path.resolve(
    process.cwd(),
    'docs/process/artifacts/attachments',
    sanitizeSegment(projectId),
    sanitizeSegment(threadId),
  );
}

function buildRegistryPath(projectId: string, threadId: string): string {
  return path.resolve(buildThreadDir(projectId, threadId), 'registry.json');
}

async function readRegistry(projectId: string, threadId: string): Promise<CockpitAttachmentMeta[]> {
  const registryPath = buildRegistryPath(projectId, threadId);
  try {
    const raw = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(raw) as CockpitAttachmentMeta[];
  } catch {
    return [];
  }
}

async function writeRegistry(projectId: string, threadId: string, items: CockpitAttachmentMeta[]): Promise<string> {
  const registryPath = buildRegistryPath(projectId, threadId);
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(items, null, 2), 'utf-8');
  return registryPath;
}

export async function saveCockpitAttachment(input: {
  tempPath: string;
  originalName: string;
  mimeType?: string;
  size?: number;
  projectId: string;
  threadId: string;
}): Promise<CockpitAttachmentMeta> {
  const createdAt = new Date().toISOString();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const safeName = sanitizeSegment(input.originalName || 'attachment.bin');
  const fileName = `${id}-${safeName}`;
  const dir = buildThreadDir(input.projectId, input.threadId);
  await fs.mkdir(dir, { recursive: true });
  const storedPath = path.resolve(dir, fileName);
  await fs.rename(input.tempPath, storedPath);

  const relativePath = path.relative(process.cwd(), storedPath);
  const meta: CockpitAttachmentMeta = {
    id,
    originalName: input.originalName,
    storedPath,
    relativePath,
    mimeType: input.mimeType || 'application/octet-stream',
    size: Number(input.size || 0),
    threadId: input.threadId,
    projectId: input.projectId,
    createdAt,
  };

  const items = await readRegistry(input.projectId, input.threadId);
  items.push(meta);
  await writeRegistry(input.projectId, input.threadId, items);
  return meta;
}

export async function listCockpitAttachments(input: {
  projectId: string;
  threadId: string;
}): Promise<{ registryPath: string; items: CockpitAttachmentMeta[] }> {
  const items = await readRegistry(input.projectId, input.threadId);
  return {
    registryPath: buildRegistryPath(input.projectId, input.threadId),
    items,
  };
}
