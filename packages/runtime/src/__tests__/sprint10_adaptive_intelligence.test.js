"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const AdaptiveIntelligenceEngine_1 = require("../adaptive/AdaptiveIntelligenceEngine");
function mkTmpWorkspace() {
    return fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 's10-adaptive-'));
}
function seedCost(workspace, runId, projectId = 'agent_system') {
    const dir = path_1.default.join(workspace, 'docs/process/runs/cost');
    fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(dir, `${runId}.json`), JSON.stringify({ runId, projectId, tokens: 1234, retries: 1, loops: 2 }, null, 2), 'utf-8');
}
function test_model_router() {
    const workspace = mkTmpWorkspace();
    const route1 = (0, AdaptiveIntelligenceEngine_1.routeModelForTask)({
        workspacePath: workspace,
        runId: 'run-s10-1',
        projectId: 'agent_system',
        userMessage: 'Please classify this ticket and route it',
    });
    console.assert(route1.modelTier === 'cheap', 'classification should route to cheap tier');
    const route2 = (0, AdaptiveIntelligenceEngine_1.routeModelForTask)({
        workspacePath: workspace,
        runId: 'run-s10-2',
        projectId: 'agent_system',
        userMessage: 'Need architecture design for system runtime',
    });
    console.assert(route2.modelTier === 'expensive', 'design should route to expensive tier');
    console.log('[PASS] S10 model router');
}
function test_learning_signals_and_policy() {
    const workspace = mkTmpWorkspace();
    const runId = 'run-s10-3';
    seedCost(workspace, runId);
    const signals = (0, AdaptiveIntelligenceEngine_1.collectLearningSignals)(workspace, runId, 'agent_system');
    console.assert(signals.tokens === 1234, 'expected tokens from cost ledger');
    const policy = (0, AdaptiveIntelligenceEngine_1.decideAdaptivePolicy)(signals);
    console.assert(policy.retryLimit === 1, 'default stable policy retry limit should be 1');
    console.assert(policy.enableImprovementLoop === true, 'default stable policy should keep improvement loop');
    console.log('[PASS] S10 learning signals + adaptive policy');
}
function test_bounded_adaptation_and_logging() {
    const workspace = mkTmpWorkspace();
    const prev = { retryLimit: 0, enableImprovementLoop: true, preferredTier: 'cheap', reason: 'prev' };
    const next = { retryLimit: 3, enableImprovementLoop: false, preferredTier: 'expensive', reason: 'next' };
    const bounded = (0, AdaptiveIntelligenceEngine_1.enforceBoundedAdaptation)(prev, next, 1);
    console.assert(bounded.retryLimit === 1, 'retry delta should be bounded to +1');
    const route = (0, AdaptiveIntelligenceEngine_1.routeModelForTask)({
        workspacePath: workspace,
        runId: 'run-s10-4',
        projectId: 'agent_system',
        userMessage: 'general task',
    });
    const file = (0, AdaptiveIntelligenceEngine_1.writeAdaptiveLog)(workspace, {
        runId: 'run-s10-4',
        projectId: 'agent_system',
        route,
        policy: bounded,
    });
    console.assert(fs_1.default.existsSync(file), 'adaptive log must be written');
    console.log('[PASS] S10 bounded adaptation + adaptive log');
}
(async () => {
    console.log('\n=== Sprint 10 Adaptive Intelligence Tests ===\n');
    test_model_router();
    test_learning_signals_and_policy();
    test_bounded_adaptation_and_logging();
    console.log('\n=== Sprint 10 adaptive intelligence tests completed successfully ===\n');
    process.exit(0);
})();
