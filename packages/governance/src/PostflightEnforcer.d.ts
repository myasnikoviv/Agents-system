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
export declare function checkPostflightEvidence(input: PostflightCheckInput): PostflightCheckResult;
/**
 * Enforce postflight hard gate — throws if required artifacts are missing.
 */
export declare function enforcePostflightGate(input: PostflightCheckInput): PostflightCheckResult;
/**
 * Write a minimal test report stub so the postflight gate can pass.
 * Use this in automated pipelines that produce machine-generated evidence.
 */
export declare function writeTestReportStub(input: {
    ticket: string;
    status: 'PASS' | 'FAIL' | 'N/A';
    notes?: string;
    testsDir?: string;
}): string;
export declare class GovernancePostflightError extends Error {
    readonly missingArtifacts: string[];
    constructor(message: string, missingArtifacts: string[]);
}
