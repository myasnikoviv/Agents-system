"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const SmartRetryPolicy_1 = require("../optimization/SmartRetryPolicy");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'smart-retry-'));
}
describe('SmartRetryPolicy', () => {
    it('classifies errors and retries selectively', () => {
        expect((0, SmartRetryPolicy_1.classifyRetryError)('HTTP 429 too many requests')).toBe('rate_limited');
        expect((0, SmartRetryPolicy_1.classifyRetryError)('request timeout reached')).toBe('timeout');
        expect((0, SmartRetryPolicy_1.classifyRetryError)('invalid request schema')).toBe('validation');
        expect((0, SmartRetryPolicy_1.classifyRetryError)('authentication failed: api key')).toBe('auth');
    });
    it('blocks retry for non-retryable and expensive cases', () => {
        const workspace = mkTmpWorkspace();
        const policyPath = path_1.default.join(workspace, 'docs/runtime/adaptive/smart-retry-policy.json');
        fs_1.default.mkdirSync(path_1.default.dirname(policyPath), { recursive: true });
        fs_1.default.writeFileSync(policyPath, JSON.stringify({
            enabled: true,
            maxExpensiveRetryTokens: 100,
            retryableClasses: ['transient', 'rate_limited', 'timeout'],
        }, null, 2), 'utf-8');
        const nonRetryable = (0, SmartRetryPolicy_1.shouldSmartRetry)({
            workspacePath: workspace,
            errorText: 'invalid request schema',
            estimatedTokens: 10,
        });
        expect(nonRetryable.retry).toBe(false);
        const expensive = (0, SmartRetryPolicy_1.shouldSmartRetry)({
            workspacePath: workspace,
            errorText: 'HTTP 429 too many requests',
            estimatedTokens: 500,
        });
        expect(expensive.retry).toBe(false);
        const allowed = (0, SmartRetryPolicy_1.shouldSmartRetry)({
            workspacePath: workspace,
            errorText: 'HTTP 429 too many requests',
            estimatedTokens: 10,
        });
        expect(allowed.retry).toBe(true);
    });
});
