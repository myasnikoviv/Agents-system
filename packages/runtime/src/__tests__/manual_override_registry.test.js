"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const governance_1 = require("@system/governance");
describe('ManualOverrideRegistry', () => {
    let tmpDir;
    const oldCwd = process.cwd();
    beforeEach(() => {
        tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'agsys-override-'));
        process.chdir(tmpDir);
    });
    afterEach(() => {
        process.chdir(oldCwd);
    });
    it('stores and resolves rule-level overrides', () => {
        (0, governance_1.addManualOverride)({
            projectId: 'proj-a',
            scope: 'rule',
            ruleId: 'git_preflight',
            actorId: 'tester',
            reason: 'temporary unblock',
            ticketId: 'AGSYS-537',
        });
        const rows = (0, governance_1.listManualOverrides)();
        expect(rows.length).toBe(1);
        const ctx = {
            runId: 'r1',
            projectId: 'proj-a',
            ticketId: 'AGSYS-537',
            chainId: 'c1',
            workspacePath: tmpDir,
        };
        const hit = (0, governance_1.resolveManualOverride)({
            context: ctx,
            phase: 'BEFORE_RUN',
            ruleId: 'git_preflight',
        });
        expect(hit?.scope).toBe('rule');
        expect(hit?.ruleId).toBe('git_preflight');
    });
});
