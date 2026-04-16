"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const OpenAIDiagnostics_1 = require("../OpenAIDiagnostics");
(0, globals_1.describe)('OpenAIDiagnostics', () => {
    (0, globals_1.it)('classifies insufficient_quota', () => {
        const e = { code: 'insufficient_quota', message: 'quota exceeded' };
        (0, globals_1.expect)((0, OpenAIDiagnostics_1.classifyOpenAIError)(e)).toBe('insufficient_quota');
    });
    (0, globals_1.it)('classifies auth issues', () => {
        const e = { message: 'Missing credentials. Please pass an apiKey' };
        (0, globals_1.expect)((0, OpenAIDiagnostics_1.classifyOpenAIError)(e)).toBe('auth');
    });
    (0, globals_1.it)('classifies rate limits', () => {
        const e = { type: 'rate_limit_error', message: 'Too many requests' };
        (0, globals_1.expect)((0, OpenAIDiagnostics_1.classifyOpenAIError)(e)).toBe('rate_limit');
    });
    (0, globals_1.it)('returns ok=true on successful probe', async () => {
        const client = {
            responses: {
                create: async () => ({ id: 'resp_123' }),
            },
        };
        const result = await (0, OpenAIDiagnostics_1.runOpenAIProbe)(client);
        (0, globals_1.expect)(result.ok).toBe(true);
        (0, globals_1.expect)(result.model).toBeDefined();
    });
    (0, globals_1.it)('returns classified error on failed probe', async () => {
        const client = {
            responses: {
                create: async () => {
                    const err = new Error('429 You exceeded your current quota');
                    err.code = 'insufficient_quota';
                    throw err;
                },
            },
        };
        const result = await (0, OpenAIDiagnostics_1.runOpenAIProbe)(client);
        (0, globals_1.expect)(result.ok).toBe(false);
        (0, globals_1.expect)(result.category).toBe('insufficient_quota');
    });
});
