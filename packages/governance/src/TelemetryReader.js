"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTelemetry = readTelemetry;
exports.readLoopPressure = readLoopPressure;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@system/shared");
function readTelemetry(workspacePath, runId) {
    const ledgerFile = path_1.default.join((0, shared_1.resolveRuntimePath)(workspacePath, 'processLedgerDir'), `${runId}.jsonl`);
    let totalTokens = 0;
    let entries = 0;
    if (fs_1.default.existsSync(ledgerFile)) {
        const lines = fs_1.default.readFileSync(ledgerFile, 'utf-8').split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const ev = JSON.parse(line);
                const t = Number(ev?.payload?.tokensInput || 0) + Number(ev?.payload?.tokensOutput || 0);
                totalTokens += Number.isFinite(t) ? t : 0;
                entries += 1;
            }
            catch {
                // ignore malformed lines
            }
        }
    }
    const skillTelemetryPath = (0, shared_1.resolveRuntimePath)(workspacePath, 'processSkillTelemetryFile');
    return {
        totalTokens,
        entries,
        hasSkillTelemetry: fs_1.default.existsSync(skillTelemetryPath),
    };
}
function readLoopPressure(workspacePath, runId) {
    const ledgerFile = path_1.default.join((0, shared_1.resolveRuntimePath)(workspacePath, 'processLedgerDir'), `${runId}.jsonl`);
    let retries = 0;
    let governanceChecks = 0;
    if (fs_1.default.existsSync(ledgerFile)) {
        const lines = fs_1.default.readFileSync(ledgerFile, 'utf-8').split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const ev = JSON.parse(line);
                const type = String(ev?.type || '');
                if (type === 'guard.retry')
                    retries += 1;
                if (type === 'governance.rule_check')
                    governanceChecks += 1;
            }
            catch {
                // ignore malformed lines
            }
        }
    }
    return { retries, governanceChecks };
}
