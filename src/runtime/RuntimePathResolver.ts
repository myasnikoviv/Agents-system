import fs from 'fs';
import path from 'path';

export type RuntimePathKey =
  | 'governanceLogsDir'
  | 'governanceRuleRegistryFile'
  | 'governanceRuleCatalogFile'
  | 'governanceLoopCatalogFile'
  | 'governanceProjectPolicyFile'
  | 'governanceExecutionPolicyFile'
  | 'processPreflightsDir'
  | 'processTestsDir'
  | 'processRetrospectivesDir'
  | 'knowledgeLessonsDir'
  | 'processLedgerDir'
  | 'processSkillTelemetryFile'
  | 'processBlockersDir'
  | 'processCostDir';

type RuntimePathConfig = Partial<Record<RuntimePathKey, string>>;

const DEFAULT_PATHS: Record<RuntimePathKey, string> = {
  governanceLogsDir: 'docs/runtime/governance/logs',
  governanceRuleRegistryFile: 'docs/runtime/governance/rule-registry.yaml',
  governanceRuleCatalogFile: 'docs/runtime/governance/rule-catalog.json',
  governanceLoopCatalogFile: 'docs/runtime/governance/loop-catalog.json',
  governanceProjectPolicyFile: 'docs/runtime/governance/project-policy.json',
  governanceExecutionPolicyFile: 'docs/runtime/governance/execution-policy.json',
  processPreflightsDir: 'docs/process/git/preflights',
  processTestsDir: 'docs/process/tests',
  processRetrospectivesDir: 'docs/process/retrospectives',
  knowledgeLessonsDir: 'docs/knowledge/lessons-learned',
  processLedgerDir: 'docs/process/runs/ledger',
  processSkillTelemetryFile: 'docs/process/skills/telemetry/skill-usage.jsonl',
  processBlockersDir: 'docs/process/blockers',
  processCostDir: 'docs/process/runs/cost',
};

function loadRuntimePathConfig(workspacePath: string): RuntimePathConfig {
  const filePath = path.resolve(workspacePath, 'docs/runtime/path-config.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RuntimePathConfig;
  } catch {
    return {};
  }
}

export function resolveRuntimePath(workspacePath: string, key: RuntimePathKey): string {
  const cfg = loadRuntimePathConfig(workspacePath);
  const relativePath = cfg[key] || DEFAULT_PATHS[key];
  return path.resolve(workspacePath, relativePath);
}
