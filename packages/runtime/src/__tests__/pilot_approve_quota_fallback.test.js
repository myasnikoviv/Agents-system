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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../AgentExecutor', () => {
    return {
        AgentExecutor: class {
            async runRole() {
                const err = new Error('429 You exceeded your current quota');
                err.code = 'insufficient_quota';
                err.type = 'insufficient_quota';
                err.error = { code: 'insufficient_quota', type: 'insufficient_quota', param: null };
                throw err;
            }
        }
    };
});
globals_1.jest.mock('@system/events', () => ({
    emitEvent: globals_1.jest.fn().mockResolvedValue('msg-id-mock'),
}));
(0, globals_1.describe)('PilotGraph approve continuation with quota errors', () => {
    const originalKey = process.env.OPENAI_API_KEY;
    (0, globals_1.beforeEach)(() => {
        process.env.OPENAI_API_KEY = 'test-key';
        globals_1.jest.resetModules();
    });
    (0, globals_1.afterEach)(() => {
        if (originalKey === undefined) {
            delete process.env.OPENAI_API_KEY;
        }
        else {
            process.env.OPENAI_API_KEY = originalKey;
        }
    });
    (0, globals_1.it)('does not throw on QA step and emits default marker before git approval', async () => {
        const { executeUnifiedSwarmRun, unifiedSwarmGraph } = await Promise.resolve().then(() => __importStar(require('../graphs/UnifiedSwarmGraph')));
        const threadId = `thread-${Date.now()}`;
        const initialState = {
            ticketId: 'TKT-59',
            runId: `run-${Date.now()}`,
            threadId: threadId,
            status: 'initialized',
            artifactLogs: [],
            executionOptions: { mode: 'multiple_agents' },
        };
        const firstPass = await executeUnifiedSwarmRun(initialState);
        (0, globals_1.expect)(Array.isArray(firstPass.artifactLogs)).toBe(true);
        (0, globals_1.expect)(firstPass.artifactLogs.some((log) => log.includes('[stage:qa]') && log.includes('[recovery:insufficient_quota]'))).toBe(true);
        const threadConfig = { configurable: { threadId: threadId } };
        // Continue from interrupt-before-git to completion.
        const resumed = await unifiedSwarmGraph.invoke(null, threadConfig);
        (0, globals_1.expect)(resumed).toBeDefined();
        (0, globals_1.expect)(Array.isArray(resumed.artifactLogs)).toBe(true);
        (0, globals_1.expect)(resumed.artifactLogs.some((log) => log.includes('[stage:docs]'))).toBe(true);
    }, 15000);
});
