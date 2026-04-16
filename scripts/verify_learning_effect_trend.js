"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_1 = require("@system/runtime");
function main() {
    const workspacePath = process.cwd();
    const projectId = process.env.LEARNING_TREND_PROJECT_ID || 'agent_system';
    const runId = process.env.LEARNING_TREND_RUN_ID || `trend-${Date.now()}`;
    const result = (0, runtime_1.evaluateLearningTrendKpi)({
        workspacePath,
        projectId,
        runId,
        windowSize: Number(process.env.LEARNING_TREND_WINDOW || '5'),
    });
    console.log(`Learning trend report: ${result.reportPath}`);
    if (result.regressionAlarmPath) {
        console.log(`Learning trend alarm: ${result.regressionAlarmPath}`);
    }
    console.log(`SCORE=${result.score.toFixed(2)}`);
    console.log(`PASS=${result.pass}`);
}
main();
