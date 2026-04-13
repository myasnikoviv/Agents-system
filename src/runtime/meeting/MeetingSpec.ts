import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export type MeetingMode = 'debate' | 'review' | 'alignment';
export type TurnStrategy = 'round_robin';

export interface MeetingSpec {
  pipeline: 'meeting';
  mode: MeetingMode;
  participants: string[];
  moderator: string;
  rounds: number;
  turn_strategy: TurnStrategy;
  rules: string[];
  artifacts: string[];
}

interface MeetingValidationConfig {
  allowedModes: MeetingMode[];
  allowedTurnStrategies: TurnStrategy[];
  requiredRules: string[];
  requiredArtifacts: string[];
  rounds: {
    min: number;
    max: number;
  };
}

const DEFAULT_VALIDATION_CONFIG: MeetingValidationConfig = {
  allowedModes: ['debate', 'review', 'alignment'],
  allowedTurnStrategies: ['round_robin'],
  requiredRules: ['each_agent_must_provide_argument', 'moderator_must_finalize_decision'],
  requiredArtifacts: ['decision'],
  rounds: { min: 1, max: 10 },
};

function parseMarkdownFrontmatter(input: string): Record<string, unknown> | null {
  const match = String(input).match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const parsed = yaml.load(match[1]);
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
}

function parseRaw(content: string, ext: string): Record<string, unknown> {
  if (ext === '.yaml' || ext === '.yml') {
    const parsed = yaml.load(content);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  }
  if (ext === '.md') {
    return parseMarkdownFrontmatter(content) || {};
  }
  throw new Error(`Unsupported meeting spec extension: ${ext}`);
}

function ensureStringList(input: unknown, field: string): string[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error(`Meeting spec requires non-empty "${field}"`);
  }
  const out = input.map((v) => String(v || '').trim()).filter(Boolean);
  if (out.length === 0) {
    throw new Error(`Meeting spec requires non-empty "${field}"`);
  }
  return out;
}

function loadMeetingValidationConfig(workspacePath = process.cwd()): MeetingValidationConfig {
  const candidates = [
    path.join(workspacePath, 'docs/runtime/meetings/validation-rules.yaml'),
    path.join(workspacePath, 'docs/runtime/meetings/validation-rules.yml'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) return DEFAULT_VALIDATION_CONFIG;
  const raw = yaml.load(fs.readFileSync(found, 'utf-8'));
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const requiredRules = Array.isArray(obj.requiredRules)
    ? obj.requiredRules.map((x) => String(x || '').trim()).filter(Boolean)
    : DEFAULT_VALIDATION_CONFIG.requiredRules;
  const requiredArtifacts = Array.isArray(obj.requiredArtifacts)
    ? obj.requiredArtifacts.map((x) => String(x || '').trim()).filter(Boolean)
    : DEFAULT_VALIDATION_CONFIG.requiredArtifacts;
  const allowedModes = Array.isArray(obj.allowedModes)
    ? obj.allowedModes
        .map((x) => String(x || '').trim() as MeetingMode)
        .filter((x): x is MeetingMode => x === 'debate' || x === 'review' || x === 'alignment')
    : DEFAULT_VALIDATION_CONFIG.allowedModes;
  const allowedTurnStrategies = Array.isArray(obj.allowedTurnStrategies)
    ? obj.allowedTurnStrategies
        .map((x) => String(x || '').trim() as TurnStrategy)
        .filter((x): x is TurnStrategy => x === 'round_robin')
    : DEFAULT_VALIDATION_CONFIG.allowedTurnStrategies;
  const roundsRaw = obj.rounds && typeof obj.rounds === 'object' ? (obj.rounds as Record<string, unknown>) : {};
  const minRounds = Math.max(1, Number(roundsRaw.min ?? DEFAULT_VALIDATION_CONFIG.rounds.min));
  const maxRounds = Math.max(minRounds, Number(roundsRaw.max ?? DEFAULT_VALIDATION_CONFIG.rounds.max));

  return {
    allowedModes: allowedModes.length > 0 ? allowedModes : DEFAULT_VALIDATION_CONFIG.allowedModes,
    allowedTurnStrategies: allowedTurnStrategies.length > 0 ? allowedTurnStrategies : DEFAULT_VALIDATION_CONFIG.allowedTurnStrategies,
    requiredRules: requiredRules.length > 0 ? requiredRules : DEFAULT_VALIDATION_CONFIG.requiredRules,
    requiredArtifacts: requiredArtifacts.length > 0 ? requiredArtifacts : DEFAULT_VALIDATION_CONFIG.requiredArtifacts,
    rounds: { min: minRounds, max: maxRounds },
  };
}

export function validateMeetingSpec(spec: MeetingSpec, config: MeetingValidationConfig = DEFAULT_VALIDATION_CONFIG): MeetingSpec {
  if (spec.pipeline !== 'meeting') {
    throw new Error('Meeting spec pipeline must be "meeting"');
  }
  if (!config.allowedModes.includes(spec.mode)) {
    throw new Error(`Unsupported meeting mode: ${spec.mode}`);
  }
  if (!spec.participants.includes(spec.moderator)) {
    throw new Error('Moderator must be included in participants');
  }
  if (!Number.isInteger(spec.rounds) || spec.rounds < config.rounds.min || spec.rounds > config.rounds.max) {
    throw new Error(`Meeting rounds must be an integer in range ${config.rounds.min}..${config.rounds.max}`);
  }
  if (!config.allowedTurnStrategies.includes(spec.turn_strategy)) {
    throw new Error(`Unsupported turn strategy: ${spec.turn_strategy}`);
  }
  for (const required of config.requiredRules) {
    if (!spec.rules.includes(required)) {
      throw new Error(`Missing required meeting rule: ${required}`);
    }
  }
  for (const requiredArtifact of config.requiredArtifacts) {
    if (!spec.artifacts.includes(requiredArtifact)) {
      throw new Error(`Meeting artifacts must include "${requiredArtifact}"`);
    }
  }
  return spec;
}

export function parseMeetingSpecFromContent(
  content: string,
  ext: '.yaml' | '.yml' | '.md',
  config: MeetingValidationConfig = DEFAULT_VALIDATION_CONFIG,
): MeetingSpec {
  const raw = parseRaw(content, ext) as Record<string, unknown>;
  const spec: MeetingSpec = {
    pipeline: (String(raw.pipeline || 'meeting').trim() as MeetingSpec['pipeline']),
    mode: String(raw.mode || 'debate').trim() as MeetingMode,
    participants: ensureStringList(raw.participants, 'participants'),
    moderator: String(raw.moderator || '').trim(),
    rounds: Number(raw.rounds || 1),
    turn_strategy: String(raw.turn_strategy || 'round_robin').trim() as TurnStrategy,
    rules: ensureStringList(raw.rules, 'rules'),
    artifacts: ensureStringList(raw.artifacts, 'artifacts'),
  };
  return validateMeetingSpec(spec, config);
}

export function resolveMeetingSpec(workspacePath = process.cwd()): MeetingSpec {
  const candidates = [
    path.join(workspacePath, 'docs/runtime/meetings/meeting-spec.yaml'),
    path.join(workspacePath, 'docs/runtime/meetings/meeting-spec.yml'),
    path.join(workspacePath, 'docs/runtime/meetings/meeting-spec.md'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('Meeting spec file not found under docs/runtime/meetings/');
  }
  const validationConfig = loadMeetingValidationConfig(workspacePath);
  const ext = path.extname(found).toLowerCase() as '.yaml' | '.yml' | '.md';
  const content = fs.readFileSync(found, 'utf-8');
  return parseMeetingSpecFromContent(content, ext, validationConfig);
}
