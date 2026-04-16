"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeterministicEvaluator = registerDeterministicEvaluator;
exports.listDeterministicEvaluators = listDeterministicEvaluators;
exports.evaluateDeterministic = evaluateDeterministic;
const ArtifactEvidenceChecker_1 = require("./ArtifactEvidenceChecker");
const EventEvidenceCollector_1 = require("./EventEvidenceCollector");
const TelemetryReader_1 = require("./TelemetryReader");
const EvaluatorRegistry_1 = require("./EvaluatorRegistry");
function isValidTicketContext(ticketId) {
    const value = String(ticketId || '').trim();
    if (!value || value === 'AGSYS-UNKNOWN' || value.toLowerCase() === 'none')
        return false;
    return /^[A-Z][A-Z0-9_-]*-\d+$/.test(value);
}
const DETERMINISTIC_HANDLERS = {
    preflight_token: async (rule, ctx, workspacePath) => {
        if (!ctx.hasMutatingAction) {
            return { ruleId: rule.id, verdict: 'pass', reason: 'non_mutating_action', evidenceSummary: 'skip preflight for non-mutation' };
        }
        const r = (0, ArtifactEvidenceChecker_1.checkPreflightToken)(workspacePath, ctx.ticketId, rule.evidence);
        return {
            ruleId: rule.id,
            verdict: r.found ? 'pass' : 'fail',
            reason: r.found ? 'preflight_token_present' : 'preflight_token_missing',
            evidenceSummary: r.matchedPath || 'none',
        };
    },
    ticket_context_present: async (rule, ctx) => {
        const pass = isValidTicketContext(ctx.ticketId);
        return {
            ruleId: rule.id,
            verdict: pass ? 'pass' : 'fail',
            reason: pass ? 'ticket_context_valid' : 'ticket_context_invalid',
            evidenceSummary: pass ? ctx.ticketId : 'none',
        };
    },
    postflight_report: async (rule, ctx, workspacePath) => {
        const r = (0, ArtifactEvidenceChecker_1.checkTestReport)(workspacePath, ctx.ticketId, rule.evidence);
        return {
            ruleId: rule.id,
            verdict: r.found ? 'pass' : 'fail',
            reason: r.found ? 'test_report_present' : 'test_report_missing',
            evidenceSummary: r.matchedPath || 'none',
        };
    },
    improvement_artifact: async (rule, ctx, workspacePath) => {
        if (String(process.env.GOVERNANCE_SMART_SKIP_IMPROVEMENT_LOOP || '').toLowerCase() === 'true') {
            return {
                ruleId: rule.id,
                verdict: 'pass',
                reason: 'improvement_loop_smart_skipped_low_risk',
                evidenceSummary: 'smart_skip_enabled',
            };
        }
        const r = (0, ArtifactEvidenceChecker_1.checkImprovementArtifact)(workspacePath, ctx.ticketId, rule.evidence);
        return {
            ruleId: rule.id,
            verdict: r.found ? 'pass' : 'fail',
            reason: r.found ? 'improvement_artifact_present' : 'improvement_artifact_missing',
            evidenceSummary: r.matchedPath || 'none',
        };
    },
    agent_usage_events: async (rule, ctx) => {
        const e = await (0, EventEvidenceCollector_1.collectEventEvidence)(ctx.runId);
        return {
            ruleId: rule.id,
            verdict: e.agentStarted > 0 ? 'pass' : 'fail',
            reason: e.agentStarted > 0 ? 'agents_detected' : 'no_agent_started_events',
            evidenceSummary: `agent.started=${e.agentStarted}`,
        };
    },
    pipeline_usage_events: async (rule, ctx) => {
        const e = await (0, EventEvidenceCollector_1.collectEventEvidence)(ctx.runId);
        return {
            ruleId: rule.id,
            verdict: e.stageStarted > 0 ? 'pass' : 'fail',
            reason: e.stageStarted > 0 ? 'stages_detected' : 'no_stage_started_events',
            evidenceSummary: `stage.started=${e.stageStarted}`,
        };
    },
    cost_guard_tokens: async (rule, ctx, workspacePath) => {
        const t = (0, TelemetryReader_1.readTelemetry)(workspacePath, ctx.runId);
        const threshold = Number(rule.thresholds?.maxTokens || 0) > 0
            ? Number(rule.thresholds?.maxTokens)
            : Number(process.env.GOVERNANCE_COST_GUARD_MAX_TOKENS || '120000');
        const pass = t.totalTokens <= threshold;
        return {
            ruleId: rule.id,
            verdict: pass ? 'pass' : 'fail',
            reason: pass ? 'under_cost_threshold' : 'cost_threshold_exceeded',
            evidenceSummary: `tokens=${t.totalTokens},threshold=${threshold},entries=${t.entries}`,
        };
    },
    loop_pressure_hard: async (rule, ctx, workspacePath) => {
        const lp = (0, TelemetryReader_1.readLoopPressure)(workspacePath, ctx.runId);
        const maxRetries = Number(process.env.GOVERNANCE_MAX_RETRY_LOOPS || '3');
        const maxGovernanceChecks = Number(process.env.GOVERNANCE_MAX_GOVERNANCE_LOOPS || '20');
        const pass = lp.retries <= maxRetries && lp.governanceChecks <= maxGovernanceChecks;
        return {
            ruleId: rule.id,
            verdict: pass ? 'pass' : 'fail',
            reason: pass ? 'loop_pressure_within_bounds' : 'loop_pressure_exceeded',
            evidenceSummary: `retries=${lp.retries}/${maxRetries},governanceChecks=${lp.governanceChecks}/${maxGovernanceChecks}`,
        };
    },
};
let builtinsRegistered = false;
function registerDeterministicEvaluator(input) {
    (0, EvaluatorRegistry_1.registerEvaluator)({
        evaluatorType: input.evaluatorType,
        evaluate: input.evaluate,
        source: input.source || 'plugin',
        allowOverrideBuiltin: input.allowOverrideBuiltin === true,
    });
}
function ensureBuiltinEvaluatorsRegistered() {
    if (builtinsRegistered && (0, EvaluatorRegistry_1.listEvaluators)().length > 0)
        return;
    for (const [evaluatorType, evaluate] of Object.entries(DETERMINISTIC_HANDLERS)) {
        (0, EvaluatorRegistry_1.registerEvaluator)({
            evaluatorType,
            evaluate,
            source: 'builtin',
        });
    }
    builtinsRegistered = true;
}
function listDeterministicEvaluators() {
    ensureBuiltinEvaluatorsRegistered();
    return (0, EvaluatorRegistry_1.listEvaluators)();
}
async function evaluateDeterministic(rule, ctx) {
    ensureBuiltinEvaluatorsRegistered();
    const workspacePath = ctx.workspacePath || process.cwd();
    const checkKey = String(rule.deterministicCheck || '');
    const handler = (0, EvaluatorRegistry_1.resolveEvaluator)(checkKey);
    if (handler) {
        return handler(rule, ctx, workspacePath);
    }
    return { ruleId: rule.id, verdict: 'unknown', reason: 'unsupported_rule', evidenceSummary: 'no deterministic evaluator' };
}
