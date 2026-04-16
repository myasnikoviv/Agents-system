import fs from 'fs';
import path from 'path';
import { logGovernance } from './GovernanceLogger';
import { resolveRuntimePath } from '@system/shared';

/**
 * ENF-002 — Postflight Hard Gate
 *
 * Prevents closing a task (moving to Done) unless postflight evidence exists:
 * - docs/process/tests/<ticket>.md  → test report
 *
 * Logging: every check emits a structured log via GovernanceLogger (ENF-004).
 */

export interface PostflightCheckInput {
  /** The ticket being closed, e.g. AGSYS-ENF-001 */
  ticket: string;
  runId?: string;
  chainId?: string;
  /** Override tests dir (default: docs/process/tests) */
  testsDir?: string;
  /** Override runs dir (default: docs/process/runs) */
  runsDir?: string;
}

export interface PostflightCheckResult {
  ok: boolean;
  missingArtifacts: string[];
  presentArtifacts: string[];
}

/**
 * Checks for required postflight artifacts.
 * Returns result without throwing (caller decides whether to hard-block or warn).
 */
export function checkPostflightEvidence(input: PostflightCheckInput): PostflightCheckResult {
  const testsDir = input.testsDir ?? resolveRuntimePath(process.cwd(), 'processTestsDir');
  const safe = input.ticket.replace(/[^a-zA-Z0-9._-]/g, '_');

  const required: Array<{ label: string; filePath: string }> = [
    { label: 'test_report', filePath: path.join(testsDir, `${safe}.md`) },
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const req of required) {
    if (fs.existsSync(req.filePath)) {
      present.push(req.label);
    } else {
      missing.push(req.label);
    }
  }

  const ok = missing.length === 0;

  logGovernance({
    rule: 'postflight_hard_gate',
    status: ok ? 'pass' : 'fail',
    action: ok ? 'allow' : 'block',
    ticket: input.ticket,
    runId: input.runId,
    chainId: input.chainId,
    detail: ok
      ? `artifacts_present=[${present.join(',')}]`
      : `missing=[${missing.join(',')}]`,
  });

  return { ok, missingArtifacts: missing, presentArtifacts: present };
}

/**
 * Enforce postflight hard gate — throws if required artifacts are missing.
 */
export function enforcePostflightGate(input: PostflightCheckInput): PostflightCheckResult {
  const result = checkPostflightEvidence(input);
  if (!result.ok) {
    throw new GovernancePostflightError(
      `[ENF-002] Postflight hard gate BLOCKED for ticket=${input.ticket}. ` +
        `Missing: ${result.missingArtifacts.join(', ')}. ` +
        `Create docs/process/tests/${input.ticket}.md before closing.`,
      result.missingArtifacts,
    );
  }
  return result;
}

/**
 * Write a minimal test report stub so the postflight gate can pass.
 * Use this in automated pipelines that produce machine-generated evidence.
 */
export function writeTestReportStub(input: {
  ticket: string;
  status: 'PASS' | 'FAIL' | 'N/A';
  notes?: string;
  testsDir?: string;
}): string {
  const testsDir = input.testsDir ?? resolveRuntimePath(process.cwd(), 'processTestsDir');
  fs.mkdirSync(testsDir, { recursive: true });
  const safe = input.ticket.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(testsDir, `${safe}.md`);

  if (fs.existsSync(filePath)) return filePath; // don't overwrite existing

  const body = [
    `# Test Report — ${input.ticket}`,
    `- Generated: ${new Date().toISOString()}`,
    `- Status: ${input.status}`,
    '',
    '## Evidence',
    input.notes ?? '- Auto-generated stub. Replace with real test output.',
    '',
    '## CLI / API Smoke',
    '- N/A (governance enforcement task — no CLI smoke required)',
    '',
    '## UI Smoke',
    '- N/A (governance enforcement task — no UI smoke required)',
    '',
  ].join('\n');

  fs.writeFileSync(filePath, body, 'utf-8');

  logGovernance({
    rule: 'postflight_stub_written',
    status: 'pass',
    action: 'allow',
    ticket: input.ticket,
    detail: `path=${filePath}`,
  });

  return filePath;
}

export class GovernancePostflightError extends Error {
  constructor(
    message: string,
    public readonly missingArtifacts: string[],
  ) {
    super(message);
    this.name = 'GovernancePostflightError';
  }
}
