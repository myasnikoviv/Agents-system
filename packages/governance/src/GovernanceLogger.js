"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logGovernance = logGovernance;
exports.readGovernanceLogs = readGovernanceLogs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@system/shared");
function getLogDir() {
    return (0, shared_1.resolveRuntimePath)(process.cwd(), 'governanceLogsDir');
}
function ensureLogDir() {
    const LOG_DIR = getLogDir();
    if (!fs_1.default.existsSync(LOG_DIR)) {
        fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
    }
}
/**
 * Write a governance log entry to:
 * - stdout (structured JSON, always)
 * - docs/runtime/governance/logs/<ticket|global>.jsonl (append)
 * - Redis Event Stream via EventBus
 */
function logGovernance(entry) {
    const full = { ...entry, ts: new Date().toISOString() };
    const line = JSON.stringify(full);
    // stdout — always visible
    console.log(`[GOVERNANCE] ${line}`);
    // file append
    try {
        ensureLogDir();
        const LOG_DIR = getLogDir();
        const filename = entry.ticket
            ? `${entry.ticket.replace(/[^a-zA-Z0-9._-]/g, '_')}.jsonl`
            : 'global.jsonl';
        fs_1.default.appendFileSync(path_1.default.join(LOG_DIR, filename), line + '\n', 'utf-8');
    }
    catch {
        // non-blocking: log failure does not stop execution
        console.warn('[GOVERNANCE] Failed to write log to file');
    }
    // Redis Event Stream — background emission
    const { emitGovernanceEvent } = require('../events/EventBus');
    emitGovernanceEvent(full).catch((err) => {
        console.warn('[GOVERNANCE] Failed to emit event to Redis:', err.message);
    });
    // AGSYS-35B: Self-Improvement Signal Collection
    if (entry.status === 'fail' || entry.action === 'retry') {
        const { signalCollector } = require('../adaptive/SignalCollector');
        signalCollector.emit({
            type: entry.action === 'retry' ? 'retry' : 'failure',
            assetId: entry.rule,
            projectId: entry.chainId || 'default',
            value: entry.status,
            metadata: { action: entry.action, detail: entry.detail }
        }).catch((err) => {
            console.warn('[GOVERNANCE] Failed to emit self-improvement signal:', err.message);
        });
    }
    return full;
}
/**
 * Read all governance log entries for a given ticket (or global).
 */
function readGovernanceLogs(ticket) {
    ensureLogDir();
    const filename = ticket
        ? `${ticket.replace(/[^a-zA-Z0-9._-]/g, '_')}.jsonl`
        : 'global.jsonl';
    const LOG_DIR = getLogDir();
    const filePath = path_1.default.join(LOG_DIR, filename);
    if (!fs_1.default.existsSync(filePath))
        return [];
    return fs_1.default
        .readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l));
}
