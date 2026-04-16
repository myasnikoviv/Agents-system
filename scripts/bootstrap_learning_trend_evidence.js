"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function main() {
    const workspace = process.cwd();
    const dir = path_1.default.resolve(workspace, 'docs/process/runs/cost');
    fs_1.default.mkdirSync(dir, { recursive: true });
    const projectId = process.env.LEARNING_TREND_PROJECT_ID || 'agent_system';
    const seed = [
        { retries: 4, loops: 8, tokens: 92000 },
        { retries: 3, loops: 7, tokens: 87000 },
        { retries: 2, loops: 6, tokens: 83000 },
        { retries: 1, loops: 4, tokens: 78000 },
        { retries: 1, loops: 3, tokens: 74000 },
    ];
    const now = Date.now();
    for (let i = 0; i < seed.length; i += 1) {
        const runId = `trend-seed-${now}-${i + 1}`;
        const row = {
            runId,
            projectId,
            retries: seed[i].retries,
            loops: seed[i].loops,
            tokens: seed[i].tokens,
            breakdown: { execution: seed[i].tokens, governance: 0, compliance: 0, other: 0 },
            attribution: { byAgent: {}, byStep: {} },
            source: 'learning_trend_bootstrap',
            timestamp: new Date(now + i * 1000).toISOString(),
        };
        fs_1.default.writeFileSync(path_1.default.join(dir, `${runId}.json`), JSON.stringify(row, null, 2), 'utf-8');
    }
    console.log(`Bootstrapped learning trend evidence in ${dir}`);
}
main();
