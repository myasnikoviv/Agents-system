import fs from 'fs/promises';
import path from 'path';

export interface EvidenceItem {
  type: 'log' | 'screenshot' | 'artifact';
  path: string;
  label?: string;
  createdAt: string;
}

function evidencePath(ticketId: string): string {
  return path.resolve(process.cwd(), 'docs/process/runs', `${ticketId}-evidence.json`);
}

export async function addEvidenceItem(ticketId: string, item: EvidenceItem): Promise<string> {
  const file = evidencePath(ticketId);
  await fs.mkdir(path.dirname(file), { recursive: true });
  let items: EvidenceItem[] = [];
  try {
    const raw = await fs.readFile(file, 'utf-8');
    items = JSON.parse(raw) as EvidenceItem[];
  } catch {
    items = [];
  }
  items.push(item);
  await fs.writeFile(file, JSON.stringify(items, null, 2), 'utf-8');
  return file;
}

export async function readEvidenceItems(ticketId: string): Promise<{ path: string; items: EvidenceItem[] }> {
  const file = evidencePath(ticketId);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return { path: file, items: JSON.parse(raw) as EvidenceItem[] };
  } catch {
    return { path: file, items: [] };
  }
}
