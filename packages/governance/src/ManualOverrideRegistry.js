"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listManualOverrides = listManualOverrides;
exports.addManualOverride = addManualOverride;
exports.resolveManualOverride = resolveManualOverride;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@system/shared");
function overrideFile(workspacePath) {
    const root = workspacePath || process.cwd();
    const dir = path_1.default.dirname((0, shared_1.resolveRuntimePath)(root, 'governanceRuleRegistryFile'));
    return path_1.default.join(dir, 'manual-overrides.jsonl');
}
function parseLine(line) {
    try {
        const row = JSON.parse(line);
        if (!row?.id || !row?.projectId)
            return null;
        if (!row?.scope)
            return null;
        return row;
    }
    catch {
        return null;
    }
}
function listManualOverrides(workspacePath) {
    const file = overrideFile(workspacePath);
    if (!fs_1.default.existsSync(file))
        return [];
    return fs_1.default
        .readFileSync(file, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(parseLine)
        .filter((v) => Boolean(v));
}
function addManualOverride(input, workspacePath) {
    const row = {
        id: `gov-override-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        enabled: input.enabled !== false,
        ...input,
    };
    const file = overrideFile(workspacePath);
    fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
    fs_1.default.appendFileSync(file, `${JSON.stringify(row)}\n`, 'utf-8');
    return row;
}
function isExpired(row) {
    if (!row.expiresAt)
        return false;
    const ts = Date.parse(row.expiresAt);
    if (!Number.isFinite(ts))
        return false;
    return ts <= Date.now();
}
function resolveManualOverride(input) {
    const rows = listManualOverrides(input.context.workspacePath);
    return (rows.find((row) => {
        if (!row.enabled || isExpired(row))
            return false;
        if (row.projectId !== input.context.projectId)
            return false;
        if (row.ticketId && row.ticketId !== input.context.ticketId)
            return false;
        if (row.scope === 'global')
            return true;
        if (row.scope === 'phase')
            return row.phase === input.phase;
        if (row.scope === 'rule')
            return row.ruleId === input.ruleId;
        return false;
    }) || null);
}
