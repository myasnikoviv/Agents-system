"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGovernancePhase = runGovernancePhase;
const GovernanceLogger_1 = require("./GovernanceLogger");
const DeterministicEvaluationEngine_1 = require("./DeterministicEvaluationEngine");
const LlmVerifierWrapper_1 = require("./LlmVerifierWrapper");
const EmergencyBrake_1 = require("./EmergencyBrake");
const ProjectPolicyBinding_1 = require("./ProjectPolicyBinding");
const RuleRegistry_1 = require("./RuleRegistry");
const ManualOverrideRegistry_1 = require("./ManualOverrideRegistry");
const ScopeResolutionEngine_1 = require("./ScopeResolutionEngine");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const events_1 = require("@system/events");
const shared_1 = require("@system/shared");
const SOFT_GATE_MAX_RETRIES = 1;
const SOFT_GATE_MAX_WARNINGS = 1;
function countersFile(workspacePath) {
    return (0, shared_1.resolveRuntimePath)(workspacePath || process.cwd(), 'governanceRetryStateFile');
}
function loadCounters(workspacePath) {
    const file = countersFile(workspacePath);
    if (!fs_1.default.existsSync(file))
        return { retries: {}, warnings: {} };
    try {
        return JSON.parse(fs_1.default.readFileSync(file, 'utf-8'));
    }
    catch {
        return { retries: {}, warnings: {} };
    }
}
function saveCounters(counters, workspacePath) {
    const file = countersFile(workspacePath);
    fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
    fs_1.default.writeFileSync(file, JSON.stringify(counters, null, 2), 'utf-8');
}
function getRuleCounter(counters, ctx, ruleId) {
    const key = `${ctx.runId}:${ctx.ticketId}:${ruleId}`;
    return counters[key] || 0;
}
function incRuleCounter(counters, ctx, ruleId) {
    const key = `${ctx.runId}:${ctx.ticketId}:${ruleId}`;
    counters[key] = (counters[key] || 0) + 1;
}
function writeEscalationArtifact(ctx, ruleId, reason) {
    const workspacePath = ctx.workspacePath || process.cwd();
    const dir = (0, shared_1.resolveRuntimePath)(workspacePath, 'processBlockersDir');
    try {
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        const file = path_1.default.join(dir, `${ctx.ticketId}-governance-escalation.md`);
        const body = [
            `# Governance Escalation: ${ctx.ticketId}`,
            '',
            `- rule: ${ruleId}`,
            `- runId: ${ctx.runId}`,
            `- chainId: ${ctx.chainId}`,
            `- reason: ${reason}`,
            `- timestamp: ${new Date().toISOString()}`,
            '',
            'Escalated after retry/warn budget exceeded.',
            '',
        ].join('\n');
        fs_1.default.writeFileSync(file, body, 'utf-8');
        return file;
    }
    catch {
        return null;
    }
}
function loadExecutionPolicy(workspacePath) {
    const root = workspacePath || process.cwd();
    const filePath = (0, shared_1.resolveRuntimePath)(root, 'governanceExecutionPolicyFile');
    if (!fs_1.default.existsSync(filePath)) {
        return { strictDeterministic: true, llmFallbackEnabled: false };
    }
    try {
        const parsed = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        return {
            strictDeterministic: parsed.strictDeterministic !== false,
            llmFallbackEnabled: parsed.llmFallbackEnabled === true,
        };
    }
    catch {
        return { strictDeterministic: true, llmFallbackEnabled: false };
    }
}
function normalizePhaseAlias(phase) {
    if (phase === 'BEFORE_RUN' || phase === 'AFTER_STEP' || phase === 'AFTER_RUN')
        return phase;
    if (phase === 'pre_execution' || phase === 'before_execution')
        return 'BEFORE_RUN';
    if (phase === 'post_execution' || phase === 'after_execution')
        return 'AFTER_STEP';
    if (phase === 'pre_task_close' || phase === 'before_task_close')
        return 'AFTER_RUN';
    return 'AFTER_RUN';
}
async function runGovernancePhase(phase, ctx) {
    const normalizedPhase = normalizePhaseAlias(phase);
    if ((0, EmergencyBrake_1.isGlobalGovernanceDisabled)() || (0, EmergencyBrake_1.isBypassAllowed)(ctx)) {
        return { phase: normalizedPhase, blocked: false, action: 'skip', entries: [], retrySuggested: false };
    }
    const registryRules = (0, RuleRegistry_1.loadGovernanceRules)(ctx.workspacePath);
    const executionPolicy = loadExecutionPolicy(ctx.workspacePath);
    const projectPolicy = (0, ProjectPolicyBinding_1.getProjectPolicy)(ctx.projectId || 'default', ctx.workspacePath);
    const enabled = new Set(projectPolicy.enabledRules);
    const scopedRules = (0, ScopeResolutionEngine_1.resolveScopedRules)({
        rules: registryRules,
        context: ctx,
        projectOverrides: projectPolicy.ruleOverrides
    });
    const rules = scopedRules.filter((r) => !r.disabled && enabled.has(r.id) && r.triggerPhases.includes(normalizedPhase));
    const entries = [];
    let blocked = false;
    let action = 'allow';
    let retrySuggested = false;
    for (const rule of rules) {
        const manualOverride = (0, ManualOverrideRegistry_1.resolveManualOverride)({
            context: ctx,
            phase: normalizedPhase,
            ruleId: rule.id,
        });
        if (manualOverride) {
            const result = {
                ruleId: rule.id,
                verdict: 'pass',
                reason: `manual_override:${manualOverride.id}`,
                evidenceSummary: `actor=${manualOverride.actorId};scope=${manualOverride.scope};reason=${manualOverride.reason}`,
            };
            entries.push(result);
            (0, GovernanceLogger_1.logGovernance)({
                rule: rule.id,
                status: 'pass',
                action: 'allow',
                ticket: ctx.ticketId,
                runId: ctx.runId,
                chainId: ctx.chainId,
                detail: `${normalizedPhase}:manual_override;overrideId=${manualOverride.id};actor=${manualOverride.actorId};reason=${manualOverride.reason}`,
            });
            continue;
        }
        let result = await (0, DeterministicEvaluationEngine_1.evaluateDeterministic)(rule, ctx);
        const allowLlmFallback = executionPolicy.strictDeterministic ? false : executionPolicy.llmFallbackEnabled === true;
        if (result.verdict === 'unknown' &&
            allowLlmFallback &&
            (rule.evaluationType === 'hybrid' || rule.evaluationType === 'llm')) {
            result = await (0, LlmVerifierWrapper_1.runHybridVerifier)(rule, ctx, result.reason);
        }
        entries.push(result);
        if (result.verdict === 'fail') {
            if (rule.enforcementMode === 'hard') {
                blocked = true;
                action = 'block';
            }
            else if (rule.enforcementMode === 'soft' && !blocked) {
                const counters = loadCounters(ctx.workspacePath);
                const currentRetry = getRuleCounter(counters.retries, ctx, rule.id);
                if (currentRetry < SOFT_GATE_MAX_RETRIES) {
                    incRuleCounter(counters.retries, ctx, rule.id);
                    saveCounters(counters, ctx.workspacePath);
                    retrySuggested = true;
                    action = 'retry';
                }
                else {
                    const currentWarn = getRuleCounter(counters.warnings, ctx, rule.id);
                    if (currentWarn < SOFT_GATE_MAX_WARNINGS) {
                        incRuleCounter(counters.warnings, ctx, rule.id);
                        saveCounters(counters, ctx.workspacePath);
                        action = 'warn';
                    }
                    else {
                        action = 'escalate';
                        blocked = true; // Escalation counts as blocked in soft mode
                        const artifactPath = writeEscalationArtifact(ctx, rule.id, result.reason);
                        await events_1.globalEventBus.emit({
                            type: 'guard.escalate',
                            runId: ctx.runId,
                            projectId: ctx.projectId,
                            chainId: ctx.chainId,
                            actor: {
                                type: 'system',
                                id: 'governance-engine',
                            },
                            payload: {
                                ticket: ctx.ticketId,
                                rule: rule.id,
                                reason: result.reason,
                                artifactPath: artifactPath || 'none',
                            },
                        }).catch(() => undefined);
                    }
                }
            }
            else if (!blocked) {
                action = 'warn';
            }
        }
        (0, GovernanceLogger_1.logGovernance)({
            rule: rule.id,
            status: result.verdict === 'pass' ? 'pass' : result.verdict === 'fail' ? 'fail' : 'skip',
            action: action === 'block'
                ? 'block'
                : action === 'retry'
                    ? 'retry'
                    : action === 'warn'
                        ? 'warn'
                        : action === 'escalate'
                            ? 'escalate'
                            : 'allow',
            ticket: ctx.ticketId,
            runId: ctx.runId,
            chainId: ctx.chainId,
            detail: `${normalizedPhase}:${result.reason};evidence=${result.evidenceSummary}`,
        });
    }
    return { phase: normalizedPhase, blocked, action, entries, retrySuggested };
}
