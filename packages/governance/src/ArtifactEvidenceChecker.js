"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPreflightToken = checkPreflightToken;
exports.checkTestReport = checkTestReport;
exports.checkImprovementArtifact = checkImprovementArtifact;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("@system/shared");
function findFile(dir, pattern) {
    if (!fs_1.default.existsSync(dir))
        return null;
    const files = fs_1.default.readdirSync(dir);
    const found = files.find((f) => pattern.test(f));
    return found ? path_1.default.join(dir, found) : null;
}
function checkPreflightToken(workspacePath, ticketId, specificPatterns) {
    const dir = (0, shared_1.resolveRuntimePath)(workspacePath, 'processPreflightsDir');
    if (specificPatterns && specificPatterns.length > 0) {
        for (const p of specificPatterns) {
            const found = findFile(dir, new RegExp(p, 'i'));
            if (found)
                return { found: true, matchedPath: found };
        }
    }
    const found = findFile(dir, new RegExp(`^${ticketId}\\.env$`, 'i'));
    return { found: !!found, matchedPath: found };
}
function checkTestReport(workspacePath, ticketId, specificPatterns) {
    const dir = (0, shared_1.resolveRuntimePath)(workspacePath, 'processTestsDir');
    if (specificPatterns && specificPatterns.length > 0) {
        for (const p of specificPatterns) {
            const found = findFile(dir, new RegExp(p, 'i'));
            if (found)
                return { found: true, matchedPath: found };
        }
    }
    const found = findFile(dir, new RegExp(`^${ticketId}\\.md$`, 'i'));
    return { found: !!found, matchedPath: found };
}
function checkImprovementArtifact(workspacePath, ticketId, specificPatterns) {
    const candidates = [
        (0, shared_1.resolveRuntimePath)(workspacePath, 'processRetrospectivesDir'),
        (0, shared_1.resolveRuntimePath)(workspacePath, 'knowledgeLessonsDir'),
    ];
    if (specificPatterns && specificPatterns.length > 0) {
        for (const c of candidates) {
            for (const p of specificPatterns) {
                const found = findFile(c, new RegExp(p, 'i'));
                if (found)
                    return { found: true, matchedPath: found };
            }
        }
    }
    for (const c of candidates) {
        const found = findFile(c, new RegExp(ticketId, 'i'));
        if (found)
            return { found: true, matchedPath: found };
    }
    return { found: false, matchedPath: null };
}
