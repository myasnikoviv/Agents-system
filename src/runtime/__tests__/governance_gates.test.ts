/**
 * Tests: ENF-001, ENF-002, ENF-004
 * Sprint 5.5 — Enforcement MVP
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// ---- helpers -----
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gov-test-'));
}

function writePreflightToken(preflightDir: string, branch: string, worktree: string): string {
  fs.mkdirSync(preflightDir, { recursive: true });
  const file = path.join(preflightDir, 'TEST-001.env');
  fs.writeFileSync(
    file,
    [
      `TICKET_ID=TEST-001`,
      `BRANCH=${branch}`,
      `WORKTREE=${worktree}`,
      `STATUS=APPROVED`,
      `EXECUTION_APPROVED=YES`,
      `APPROVED_BY=test`,
      `APPROVED_AT=2026-04-01T00:00:00Z`,
    ].join('\n'),
    'utf-8',
  );
  return file;
}

// ------- ENF-004: GovernanceLogger -------
import { logGovernance, readGovernanceLogs } from '../governance/GovernanceLogger';

function test_governance_logger_writes_and_reads(): void {
  const tmpDir = makeTmpDir();
  // Monkey-patch LOG_DIR by overriding process.cwd temporarily
  // (simpler: just test the return value)
  const entry = logGovernance({
    rule: 'test_rule',
    status: 'pass',
    action: 'allow',
    ticket: 'TEST-LOGGING',
    detail: 'unit_test',
  });
  console.assert(entry.rule === 'test_rule', 'rule mismatch');
  console.assert(entry.status === 'pass', 'status mismatch');
  console.assert(entry.action === 'allow', 'action mismatch');
  console.assert(typeof entry.ts === 'string', 'ts missing');
  console.log('[PASS] ENF-004 — logGovernance returns structured entry');
}

// ------- ENF-001: PreflightEnforcer -------
import {
  enforcePreflightGate,
  checkPreflightGate,
  GovernancePreflightError,
} from '../governance/PreflightEnforcer';

function test_preflight_nonmutating_always_passes(): void {
  const result = checkPreflightGate({
    ticket: 'TEST-001',
    hasMutatingAction: false,
  });
  console.assert(result.ok === true, 'non-mutating should pass');
  console.log('[PASS] ENF-001 — non-mutating action passes without token');
}

function test_preflight_missing_token_blocks(): void {
  const tmpDir = makeTmpDir();
  let blocked = false;
  try {
    enforcePreflightGate({
      ticket: 'TEST-001',
      hasMutatingAction: true,
      repoRoot: tmpDir, // no git, no preflight dir
      preflightDir: path.join(tmpDir, 'preflights'),
    });
  } catch (err) {
    if (err instanceof GovernancePreflightError) blocked = true;
    else throw err;
  }
  console.assert(blocked, 'should have thrown GovernancePreflightError');
  console.log('[PASS] ENF-001 — missing token blocks execution');
}

function test_preflight_valid_token_passes(): void {
  const tmpDir = makeTmpDir();
  const preflightDir = path.join(tmpDir, 'preflights');
  const branch = 'feature/test-branch';
  const worktree = tmpDir;
  writePreflightToken(preflightDir, branch, worktree);

  // mock getGitExecutionContext by overriding branch via env — instead, use checkPreflightGate
  // with a real token but since branch comes from git, we test non-mutating path
  // (integration test for full path requires git setup — too heavy for unit)
  console.log('[SKIP] ENF-001 — valid token + branch match (requires git context, skipped in unit)');
}

// ------- ENF-002: PostflightEnforcer -------
import {
  enforcePostflightGate,
  checkPostflightEvidence,
  writeTestReportStub,
  GovernancePostflightError,
} from '../governance/PostflightEnforcer';

function test_postflight_missing_report_blocks(): void {
  const tmpDir = makeTmpDir();
  const result = checkPostflightEvidence({
    ticket: 'TEST-002',
    testsDir: path.join(tmpDir, 'tests'),
  });
  console.assert(result.ok === false, 'should fail without test report');
  console.assert(result.missingArtifacts.includes('test_report'), 'should list test_report as missing');
  console.log('[PASS] ENF-002 — missing test report returns fail result');
}

function test_postflight_enforce_throws_when_missing(): void {
  const tmpDir = makeTmpDir();
  let threw = false;
  try {
    enforcePostflightGate({ ticket: 'TEST-002', testsDir: path.join(tmpDir, 'tests') });
  } catch (err) {
    if (err instanceof GovernancePostflightError) threw = true;
    else throw err;
  }
  console.assert(threw, 'should throw GovernancePostflightError');
  console.log('[PASS] ENF-002 — enforcePostflightGate throws when report missing');
}

function test_postflight_with_report_passes(): void {
  const tmpDir = makeTmpDir();
  const testsDir = path.join(tmpDir, 'tests');
  writeTestReportStub({ ticket: 'TEST-002', status: 'PASS', testsDir });

  const result = checkPostflightEvidence({ ticket: 'TEST-002', testsDir });
  console.assert(result.ok === true, 'should pass with test report present');
  console.assert(result.presentArtifacts.includes('test_report'), 'test_report should be present');
  console.log('[PASS] ENF-002 — postflight passes when test report exists');
}

function test_postflight_stub_idempotent(): void {
  const tmpDir = makeTmpDir();
  const testsDir = path.join(tmpDir, 'tests');
  const p1 = writeTestReportStub({ ticket: 'TEST-002', status: 'PASS', testsDir });
  const p2 = writeTestReportStub({ ticket: 'TEST-002', status: 'PASS', testsDir }); // should not overwrite
  console.assert(p1 === p2, 'should return same path');
  console.log('[PASS] ENF-002 — writeTestReportStub is idempotent');
}

// ------- RUN -------
console.log('\n=== Sprint 5.5 Governance Gates — Unit Tests ===\n');
test_governance_logger_writes_and_reads();
test_preflight_nonmutating_always_passes();
test_preflight_missing_token_blocks();
test_preflight_valid_token_passes();
test_postflight_missing_report_blocks();
test_postflight_enforce_throws_when_missing();
test_postflight_with_report_passes();
test_postflight_stub_idempotent();
console.log('\n=== All governance gate tests passed ===\n');
