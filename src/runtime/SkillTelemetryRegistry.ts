import * as fs from 'fs/promises';
import * as path from 'path';
import { ROLE_SKILL_RULES, SkillId } from './SkillCatalog';

const TELEMETRY_DIR = path.resolve(process.cwd(), 'docs/process/skills/telemetry');
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, 'skill-usage.jsonl');

export interface SkillUsageEntry {
  timestamp: string;
  runId: string;
  ticketId: string;
  threadId: string;
  roleSlug: string;
  pipelineId: string;
  stage: string;
  skillId: string;
  sourcePath: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  outcome: 'success' | 'default' | 'error';
}

export interface SkillTelemetrySummary {
  totalEvents: number;
  bySkill: Record<string, number>;
  byRole: Record<string, number>;
  byPipeline: Record<string, number>;
  unusedSkills: string[];
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(TELEMETRY_DIR, { recursive: true });
}

export async function appendSkillUsage(entry: SkillUsageEntry): Promise<void> {
  await ensureDir();
  await fs.appendFile(TELEMETRY_FILE, `${JSON.stringify(entry)}\n`, 'utf-8');
}

export async function readSkillUsage(): Promise<SkillUsageEntry[]> {
  try {
    const raw = await fs.readFile(TELEMETRY_FILE, 'utf-8');
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as SkillUsageEntry);
  } catch {
    return [];
  }
}

function allKnownSkills(): string[] {
  const bag = new Set<string>();
  for (const roleRules of Object.values(ROLE_SKILL_RULES)) {
    for (const r of roleRules) bag.add(r.skillId);
  }
  return [...bag].sort();
}

export async function getSkillTelemetrySummary(): Promise<SkillTelemetrySummary> {
  const rows = await readSkillUsage();
  const bySkill: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  const byPipeline: Record<string, number> = {};
  for (const row of rows) {
    bySkill[row.skillId] = (bySkill[row.skillId] || 0) + 1;
    byRole[row.roleSlug] = (byRole[row.roleSlug] || 0) + 1;
    byPipeline[row.pipelineId] = (byPipeline[row.pipelineId] || 0) + 1;
  }
  const known = allKnownSkills();
  const used = new Set(Object.keys(bySkill));
  const unusedSkills = known.filter((id) => !used.has(id));
  return {
    totalEvents: rows.length,
    bySkill,
    byRole,
    byPipeline,
    unusedSkills,
  };
}

