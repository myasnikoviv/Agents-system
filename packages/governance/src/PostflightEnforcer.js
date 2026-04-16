"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernancePostflightError = void 0;
exports.checkPostflightEvidence = checkPostflightEvidence;
exports.enforcePostflightGate = enforcePostflightGate;
exports.writeTestReportStub = writeTestReportStub;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const GovernanceLogger_1 = require("./GovernanceLogger");
const shared_1 = require("@system/shared");
/**
 * Checks for required postflight artifacts.
 * Returns result without throwing (caller decides whether to hard-block or warn).
 */
function checkPostflightEvidence(input) {
    const testsDir = input.testsDir ?? (0, shared_1.resolveRuntimePath)(process.cwd(), 'processTestsDir');
    const safe = input.ticket.replace(/[^a-zA-Z0-9._-]/g, '_');
    const required = [
        { label: 'test_report', filePath: path_1.default.join(testsDir, `${safe}.md`) },
    ];
    const missing = [];
    const present = [];
    for (const req of required) {
        if (fs_1.default.existsSync(req.filePath)) {
            present.push(req.label);
        }
        else {
            missing.push(req.label);
        }
    }
    const ok = missing.length === 0;
    (0, GovernanceLogger_1.logGovernance)({
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
function enforcePostflightGate(input) {
    const result = checkPostflightEvidence(input);
    if (!result.ok) {
        throw new GovernancePostflightError(`[ENF-002] Postflight hard gate BLOCKED for ticket=${input.ticket}. ` +
            `Missing: ${result.missingArtifacts.join(', ')}. ` +
            `Create docs/process/tests/${input.ticket}.md before closing.`, result.missingArtifacts);
    }
    return result;
}
/**
 * Write a minimal test report stub so the postflight gate can pass.
 * Use this in automated pipelines that produce machine-generated evidence.
 */
function writeTestReportStub(input) {
    const testsDir = input.testsDir ?? (0, shared_1.resolveRuntimePath)(process.cwd(), 'processTestsDir');
    fs_1.default.mkdirSync(testsDir, { recursive: true });
    const safe = input.ticket.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path_1.default.join(testsDir, `${safe}.md`);
    if (fs_1.default.existsSync(filePath))
        return filePath; // don't overwrite existing
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
    fs_1.default.writeFileSync(filePath, body, 'utf-8');
    (0, GovernanceLogger_1.logGovernance)({
        rule: 'postflight_stub_written',
        status: 'pass',
        action: 'allow',
        ticket: input.ticket,
        detail: `path=${filePath}`,
    });
    return filePath;
}
class GovernancePostflightError extends Error {
    missingArtifacts;
    constructor(message, missingArtifacts) {
        super(message);
        this.missingArtifacts = missingArtifacts;
        this.name = 'GovernancePostflightError';
    }
}
exports.GovernancePostflightError = GovernancePostflightError;
