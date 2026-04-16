"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEvaluator = registerEvaluator;
exports.resolveEvaluator = resolveEvaluator;
exports.listEvaluators = listEvaluators;
exports.resetEvaluatorRegistry = resetEvaluatorRegistry;
const evaluatorHandlers = new Map();
const builtinEvaluatorTypes = new Set();
function normalizeType(input) {
    return String(input || '').trim();
}
function registerEvaluator(input) {
    const evaluatorType = normalizeType(input?.evaluatorType || '');
    if (!evaluatorType)
        return { ok: false, reason: 'evaluator_type_required' };
    if (typeof input.evaluate !== 'function')
        return { ok: false, reason: 'evaluator_function_required' };
    const isBuiltin = input.source === 'builtin';
    const exists = evaluatorHandlers.has(evaluatorType);
    const isBuiltinProtected = builtinEvaluatorTypes.has(evaluatorType);
    if (exists && isBuiltinProtected && input.allowOverrideBuiltin !== true) {
        return { ok: false, reason: 'builtin_override_blocked' };
    }
    evaluatorHandlers.set(evaluatorType, input.evaluate);
    if (isBuiltin)
        builtinEvaluatorTypes.add(evaluatorType);
    return { ok: true };
}
function resolveEvaluator(evaluatorType) {
    return evaluatorHandlers.get(normalizeType(evaluatorType));
}
function listEvaluators() {
    return Array.from(evaluatorHandlers.keys())
        .sort((a, b) => a.localeCompare(b))
        .map((evaluatorType) => ({ evaluatorType, isBuiltin: builtinEvaluatorTypes.has(evaluatorType) }));
}
function resetEvaluatorRegistry() {
    evaluatorHandlers.clear();
    builtinEvaluatorTypes.clear();
}
