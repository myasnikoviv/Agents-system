"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
describe('SkillTelemetryRegistry', () => {
    it('persists usage and builds summary with unused skills', async () => {
        const prevCwd = process.cwd();
        const tempDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'skill-telemetry-'));
        process.chdir(tempDir);
        jest.resetModules();
        const mod = await Promise.resolve().then(() => __importStar(require('../SkillTelemetryRegistry')));
        await mod.appendSkillUsage({
            timestamp: new Date().toISOString(),
            runId: 'r1',
            ticketId: 'AGSYS-27',
            threadId: 't1',
            roleSlug: 'pm-orchestrator',
            pipelineId: 'new-feature',
            stage: 'intake',
            skillId: 'pipeline-selection',
            sourcePath: 'skills/runtime/pipeline-selection/SKILL.md',
            durationMs: 42,
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            outcome: 'success',
        });
        const rows = await mod.readSkillUsage();
        expect(rows.length).toBe(1);
        expect(rows[0].ticketId).toBe('AGSYS-27');
        const summary = await mod.getSkillTelemetrySummary();
        expect(summary.totalEvents).toBe(1);
        expect(summary.bySkill['pipeline-selection']).toBe(1);
        expect(summary.byRole['pm-orchestrator']).toBe(1);
        expect(summary.byPipeline['new-feature']).toBe(1);
        expect(summary.unusedSkills).toContain('architecture-review');
        process.chdir(prevCwd);
    });
});
