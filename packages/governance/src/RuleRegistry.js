"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceRegistryError = void 0;
exports.loadGovernanceRules = loadGovernanceRules;
exports.getRuleById = getRuleById;
exports.createGovernanceRule = createGovernanceRule;
exports.updateGovernanceRule = updateGovernanceRule;
exports.disableGovernanceRule = disableGovernanceRule;
exports.deleteGovernanceRule = deleteGovernanceRule;
exports.listGovernanceRuleHistory = listGovernanceRuleHistory;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const shared_1 = require("@system/shared");
class GovernanceRegistryError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GovernanceRegistryError';
    }
}
exports.GovernanceRegistryError = GovernanceRegistryError;
function normalizeRules(input) {
    const seen = new Set();
    const normalized = [];
    for (const rule of input) {
        if (!rule?.id || seen.has(rule.id)) {
            continue;
        }
        seen.add(rule.id);
        normalized.push(rule);
    }
    return normalized;
}
function readYamlRules(workspacePath) {
    const root = workspacePath || process.cwd();
    const filePath = (0, shared_1.resolveRuntimePath)(root, 'governanceRuleRegistryFile');
    if (!fs_1.default.existsSync(filePath)) {
        throw new GovernanceRegistryError(`governance_rule_registry_missing:${filePath}`);
    }
    try {
        const raw = js_yaml_1.default.load(fs_1.default.readFileSync(filePath, 'utf-8'));
        if (!raw?.rules || !Array.isArray(raw.rules) || raw.rules.length === 0) {
            throw new GovernanceRegistryError(`governance_rule_registry_empty:${filePath}`);
        }
        const parsed = normalizeRules(raw.rules);
        if (parsed.length === 0) {
            throw new GovernanceRegistryError(`governance_rule_registry_invalid:${filePath}`);
        }
        return parsed.map((rule) => {
            const is_enabled = rule.disabled !== true;
            return {
                ...rule,
                is_enabled,
                disabled: rule.disabled === true,
                scope: rule.scope || { level: 'global' },
                metadata: {
                    name: rule.metadata?.name || rule.id,
                    description: rule.metadata?.description || '',
                    version: rule.metadata?.version || '1.0.0',
                    owner: rule.metadata?.owner || 'system',
                    tags: Array.isArray(rule.metadata?.tags) ? rule.metadata?.tags : [],
                    createdAt: rule.metadata?.createdAt || new Date().toISOString(),
                    updatedAt: rule.metadata?.updatedAt || new Date().toISOString(),
                    riskLevel: rule.metadata?.riskLevel || 'medium',
                    impactArea: rule.metadata?.impactArea || ['reliability'],
                    complianceDomain: rule.metadata?.complianceDomain || ['internal'],
                },
            };
        });
    }
    catch (error) {
        if (error instanceof GovernanceRegistryError) {
            throw error;
        }
        throw new GovernanceRegistryError(`governance_rule_registry_unreadable:${filePath}`);
    }
}
function hasYamlRule(ruleId, workspacePath) {
    try {
        return readYamlRules(workspacePath).some((rule) => rule.id === ruleId);
    }
    catch {
        return false;
    }
}
function catalogFile(workspacePath) {
    const root = workspacePath || process.cwd();
    return (0, shared_1.resolveRuntimePath)(root, 'governanceRuleCatalogFile');
}
function readCatalogRules(workspacePath) {
    const filePath = catalogFile(workspacePath);
    if (!fs_1.default.existsSync(filePath))
        return [];
    try {
        const raw = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        const list = Array.isArray(raw?.rules) ? raw.rules : [];
        return normalizeRules(list).map((rule) => {
            const is_enabled = rule.disabled !== true;
            return {
                ...rule,
                is_enabled,
                disabled: rule.disabled === true,
                scope: rule.scope || { level: 'global' },
                metadata: {
                    name: rule.metadata?.name || rule.id,
                    description: rule.metadata?.description || '',
                    version: rule.metadata?.version || '1.0.0',
                    owner: rule.metadata?.owner || 'system',
                    tags: Array.isArray(rule.metadata?.tags) ? rule.metadata?.tags : [],
                    createdAt: rule.metadata?.createdAt || new Date().toISOString(),
                    updatedAt: rule.metadata?.updatedAt || new Date().toISOString(),
                    riskLevel: rule.metadata?.riskLevel || 'medium',
                    impactArea: rule.metadata?.impactArea || ['reliability'],
                    complianceDomain: rule.metadata?.complianceDomain || ['internal'],
                },
            };
        });
    }
    catch {
        return [];
    }
}
function writeCatalogRules(rules, workspacePath) {
    const filePath = catalogFile(workspacePath);
    fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
    fs_1.default.writeFileSync(filePath, JSON.stringify({ rules: normalizeRules(rules) }, null, 2), 'utf-8');
}
function historyFile(workspacePath) {
    const root = workspacePath || process.cwd();
    return path_1.default.resolve(root, 'docs/runtime/governance/rule-history.jsonl');
}
function appendRuleHistory(input, workspacePath) {
    const row = {
        id: `rule-history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        ruleId: input.ruleId,
        action: input.action,
        timestamp: new Date().toISOString(),
        actorId: input.actorId || 'system',
        before: input.before,
        after: input.after,
    };
    const filePath = historyFile(workspacePath);
    fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
    fs_1.default.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf-8');
}
function bumpPatchVersion(version) {
    const current = String(version || '1.0.0').trim();
    const parts = current.split('.');
    if (parts.length !== 3)
        return current;
    const [major, minor, patch] = parts.map((p) => Number(p));
    if ([major, minor, patch].some((n) => Number.isNaN(n) || n < 0))
        return current;
    return `${major}.${minor}.${patch + 1}`;
}
function loadGovernanceRules(workspacePath) {
    const base = readYamlRules(workspacePath);
    const overlay = readCatalogRules(workspacePath);
    if (!overlay.length)
        return base;
    const byId = new Map();
    for (const rule of base)
        byId.set(rule.id, rule);
    for (const rule of overlay)
        byId.set(rule.id, rule);
    return Array.from(byId.values());
}
function getRuleById(ruleId, workspacePath) {
    return loadGovernanceRules(workspacePath).find((r) => r.id === ruleId);
}
/**
 * Creates a new governance rule and persists it to YAML.
 * AGSYS-2403: Rule Create API
 */
function createGovernanceRule(data, workspacePath) {
    const rules = loadGovernanceRules(workspacePath);
    const id = data.id || `rule_${Date.now()}`;
    if (rules.some(r => r.id === id)) {
        throw new GovernanceRegistryError(`governance_rule_exists:${id}`);
    }
    const now = new Date().toISOString();
    const newRule = {
        id,
        triggerPhases: data.triggerPhases || ['pre_execution'],
        evidence: data.evidence || [],
        evaluationType: data.evaluationType || 'deterministic',
        enforcementMode: data.enforcementMode || 'soft',
        enabledByDefault: data.enabledByDefault !== false,
        is_enabled: data.is_enabled !== false,
        disabled: data.is_enabled === false,
        scope: data.scope || { level: 'global' },
        metadata: {
            name: data.metadata?.name || id,
            description: data.metadata?.description || '',
            version: data.metadata?.version || '1.0.0',
            owner: data.metadata?.owner || 'system',
            tags: data.metadata?.tags || [],
            createdAt: now,
            updatedAt: now,
            riskLevel: data.metadata?.riskLevel || 'medium',
            impactArea: data.metadata?.impactArea || ['reliability'],
            complianceDomain: data.metadata?.complianceDomain || ['internal'],
        },
        thresholds: data.thresholds || {},
        deterministicCheck: data.deterministicCheck,
    };
    rules.push(newRule);
    writeCatalogRules(rules, workspacePath);
    appendRuleHistory({ action: 'create', ruleId: newRule.id, actorId: 'api-user', before: null, after: newRule }, workspacePath);
    return newRule;
}
/**
 * Updates an existing rule and persists the change.
 * AGSYS-2404: Rule Update API
 * AGSYS-2406/2407: Extend Rule Schema & Metadata Persistence
 */
function updateGovernanceRule(id, updates, workspacePath) {
    const rules = loadGovernanceRules(workspacePath);
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) {
        throw new GovernanceRegistryError(`governance_rule_not_found:${id}`);
    }
    const existing = rules[index];
    const now = new Date().toISOString();
    // Deep merge updates
    const updatedMetadata = updates.metadata ? {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: now,
    } : {
        ...existing.metadata,
        updatedAt: now,
    };
    const updatedRule = {
        ...existing,
        ...updates,
        id: existing.id, // ID cannot change
        disabled: updates.is_enabled !== undefined ? !updates.is_enabled : existing.disabled,
        is_enabled: updates.is_enabled !== undefined ? updates.is_enabled : existing.is_enabled,
        metadata: updatedMetadata,
    };
    rules[index] = updatedRule;
    writeCatalogRules(rules, workspacePath);
    appendRuleHistory({ action: 'update', ruleId: id, actorId: 'api-user', before: existing, after: updatedRule }, workspacePath);
    return updatedRule;
}
function disableGovernanceRule(ruleId, params, workspacePath) {
    const disabled = params?.disabled !== false;
    const current = loadGovernanceRules(workspacePath);
    const hit = current.find((rule) => rule.id === ruleId);
    if (!hit) {
        throw new GovernanceRegistryError(`governance_rule_not_found:${ruleId}`);
    }
    const updated = {
        ...hit,
        disabled,
        is_enabled: !disabled,
        metadata: {
            ...hit.metadata,
            updatedAt: new Date().toISOString(),
        },
    };
    const next = current.map((rule) => (rule.id === ruleId ? updated : rule));
    writeCatalogRules(next, workspacePath);
    appendRuleHistory({ action: 'disable', ruleId, actorId: 'api-user', before: hit, after: updated }, workspacePath);
    return updated;
}
function deleteGovernanceRule(ruleId, params, workspacePath) {
    const current = loadGovernanceRules(workspacePath);
    const hit = current.find((rule) => rule.id === ruleId);
    if (!hit) {
        throw new GovernanceRegistryError(`governance_rule_not_found:${ruleId}`);
    }
    if (hasYamlRule(ruleId, workspacePath)) {
        throw new GovernanceRegistryError(`governance_rule_delete_forbidden_builtin:${ruleId}`);
    }
    const { findRulePolicyReferences, purgeRuleFromPolicies } = require('./ProjectPolicyBinding');
    const refs = findRulePolicyReferences(ruleId, workspacePath);
    if (refs.length > 0 && !params?.force) {
        throw new GovernanceRegistryError(`governance_rule_in_use:${ruleId}:${JSON.stringify(refs)}`);
    }
    if (params?.force && refs.length > 0) {
        purgeRuleFromPolicies(ruleId, workspacePath);
    }
    const next = current.filter((rule) => rule.id !== ruleId);
    writeCatalogRules(next, workspacePath);
    appendRuleHistory({ action: 'delete', ruleId, actorId: 'api-user', before: hit, after: hit }, workspacePath);
    return { deletedRuleId: ruleId, removedFromPolicies: params?.force === true && refs.length > 0 };
}
function listGovernanceRuleHistory(ruleId, workspacePath) {
    const filePath = historyFile(workspacePath);
    if (!fs_1.default.existsSync(filePath))
        return [];
    const rows = fs_1.default
        .readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((line) => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter((row) => Boolean(row))
        .filter((row) => row.ruleId === ruleId);
    return rows.reverse();
}
