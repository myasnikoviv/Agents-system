"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logImprovementLoopGate = logImprovementLoopGate;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const GovernanceLogger_1 = require("./GovernanceLogger");
function logImprovementLoopGate(input) {
    const lessonsLearnedDir = path_1.default.join(input.workspacePath, 'docs', 'knowledge', 'lessons-learned');
    const retroDir = path_1.default.join(input.workspacePath, 'docs', 'process', 'retrospectives');
    // Basic check: any recent file in these dirs?
    // In a real implementation, we would check files created DURING THIS SESSION/TICKET.
    // For MVP, we check if the directory exists and has files.
    const hasLessons = fs_1.default.existsSync(lessonsLearnedDir) && fs_1.default.readdirSync(lessonsLearnedDir).length > 0;
    const hasRetro = fs_1.default.existsSync(retroDir) && fs_1.default.readdirSync(retroDir).length > 0;
    if (hasLessons || hasRetro) {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'improvement_loop',
            status: 'pass',
            action: 'allow',
            ticket: input.ticket,
            runId: input.runId,
            chainId: input.chainId,
            detail: 'lessons_learned_or_retro_exists',
        });
    }
    else {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'improvement_loop',
            status: 'skip',
            action: 'allow',
            ticket: input.ticket,
            runId: input.runId,
            chainId: input.chainId,
            detail: 'no_recent_improvement_artifacts_detected',
        });
    }
}
