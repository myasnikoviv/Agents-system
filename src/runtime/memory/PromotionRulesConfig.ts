import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PromotionThresholds {
  minContentLength: number;
}

export interface PromotionRulesConfig {
  autoPromote: Record<string, boolean>;
  thresholds: PromotionThresholds;
}

const DEFAULT_CONFIG: PromotionRulesConfig = {
  autoPromote: {
    decision: true,
    reusable_pattern: true,
    critical_insight: true,
  },
  thresholds: {
    minContentLength: 24,
  },
};

function parseMarkdownFrontmatter(content: string): Record<string, unknown> | null {
  const match = String(content).match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const parsed = yaml.load(match[1]);
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
}

function readConfigFile(filePath: string): Record<string, unknown> {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (ext === '.yaml' || ext === '.yml') {
    const parsed = yaml.load(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  }
  if (ext === '.md') {
    return parseMarkdownFrontmatter(raw) || {};
  }
  throw new Error(`Unsupported promotion config extension: ${ext}`);
}

export function resolvePromotionRulesConfig(workspacePath = process.cwd()): PromotionRulesConfig {
  const candidates = [
    path.join(workspacePath, 'docs/runtime/memory/promotion-rules.yaml'),
    path.join(workspacePath, 'docs/runtime/memory/promotion-rules.yml'),
    path.join(workspacePath, 'docs/runtime/memory/promotion-rules.md'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) return DEFAULT_CONFIG;

  const raw = readConfigFile(found);
  const autoPromote = (raw.autoPromote || {}) as Record<string, boolean>;
  const thresholds = (raw.thresholds || {}) as Partial<PromotionThresholds>;
  return {
    autoPromote: {
      ...DEFAULT_CONFIG.autoPromote,
      ...autoPromote,
    },
    thresholds: {
      minContentLength:
        Number.isFinite(Number(thresholds.minContentLength))
          ? Number(thresholds.minContentLength)
          : DEFAULT_CONFIG.thresholds.minContentLength,
    },
  };
}

export const __defaults = {
  DEFAULT_CONFIG,
};

