"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AutoRcaEngine_1 = require("../AutoRcaEngine");
(0, globals_1.describe)('AutoRcaEngine', () => {
    (0, globals_1.it)('triggers on failure signals', async () => {
        const out = await (0, AutoRcaEngine_1.runAutoRca)({
            ticketId: `TEST-RCA-${Date.now()}`,
            pipelineId: 'feature-change',
            qualityScore: 92,
            logs: ['[status:error] tool failed'],
        });
        (0, globals_1.expect)(out.triggered).toBe(true);
        (0, globals_1.expect)(out.artifactPath).toBeTruthy();
    });
    (0, globals_1.it)('does not trigger when healthy', async () => {
        const out = await (0, AutoRcaEngine_1.runAutoRca)({
            ticketId: `TEST-RCA-${Date.now()}-OK`,
            pipelineId: 'feature-change',
            qualityScore: 95,
            logs: ['all good'],
        });
        (0, globals_1.expect)(out.triggered).toBe(false);
    });
});
