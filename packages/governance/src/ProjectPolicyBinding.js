"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicyConfig = loadPolicyConfig;
exports.findRulePolicyReferences = findRulePolicyReferences;
exports.purgeRuleFromPolicies = purgeRuleFromPolicies;
exports.resolveEnabledRules = resolveEnabledRules;
exports.getProjectPolicy = getProjectPolicy;
exports.updateProjectPolicy = updateProjectPolicy;
exports.resolveProjectExecutionProfile = resolveProjectExecutionProfile;
exports.resolveProjectGitPolicy = resolveProjectGitPolicy;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RuleRegistry_1 = require("./RuleRegistry");
const shared_1 = require("@system/shared");
const PROJECT_PROFILE_DEFAULTS = {
    engineering: {
        enforceMainBranchProtection: true,
        requirePreflightToken: true,
        requireWorktreeIsolation: true,
        allowGitMutations: true,
    },
    non_engineering: {
        enforceMainBranchProtection: false,
        requirePreflightToken: false,
        requireWorktreeIsolation: false,
        allowGitMutations: false,
    },
};
function normalizeExecutionProfile(raw) {
    const value = String(raw || '').trim().toLowerCase();
    return value === 'non_engineering' ? 'non_engineering' : 'engineering';
}
function buildEffectiveGitPolicy(profile, patch) {
    return {
        ...PROJECT_PROFILE_DEFAULTS[profile],
        ...(patch || {}),
    };
}
function loadPolicyConfig(workspacePath) {
    const root = workspacePath || process.cwd();
    const governanceRules = (0, RuleRegistry_1.loadGovernanceRules)(workspacePath);
    const file = (0, shared_1.resolveRuntimePath)(root, 'governanceProjectPolicyFile');
    if (!fs_1.default.existsSync(file)) {
        return {
            defaultEnabledRules: governanceRules.filter((r) => r.enabledByDefault).map((r) => r.id),
            projects: {},
        };
    }
    try {
        return JSON.parse(fs_1.default.readFileSync(file, 'utf-8'));
    }
    catch {
        return { defaultEnabledRules: governanceRules.filter((r) => r.enabledByDefault).map((r) => r.id), projects: {} };
    }
}
function savePolicyConfig(cfg, workspacePath) {
    const root = workspacePath || process.cwd();
    const file = (0, shared_1.resolveRuntimePath)(root, 'governanceProjectPolicyFile');
    fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
    fs_1.default.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf-8');
}
function findRulePolicyReferences(ruleId, workspacePath) {
    const cfg = loadPolicyConfig(workspacePath);
    const refs = [];
    if ((cfg.defaultEnabledRules || []).includes(ruleId)) {
        refs.push({ type: 'defaultEnabled' });
    }
    for (const [projectId, projectCfg] of Object.entries(cfg.projects || {})) {
        if ((projectCfg.enabledRules || []).includes(ruleId))
            refs.push({ type: 'projectEnabled', projectId });
        if ((projectCfg.disabledRules || []).includes(ruleId))
            refs.push({ type: 'projectDisabled', projectId });
        if (projectCfg.ruleOverrides && Object.prototype.hasOwnProperty.call(projectCfg.ruleOverrides, ruleId)) {
            refs.push({ type: 'projectOverride', projectId });
        }
    }
    return refs;
}
function purgeRuleFromPolicies(ruleId, workspacePath) {
    const cfg = loadPolicyConfig(workspacePath);
    cfg.defaultEnabledRules = (cfg.defaultEnabledRules || []).filter((id) => id !== ruleId);
    for (const projectCfg of Object.values(cfg.projects || {})) {
        if (projectCfg.enabledRules) {
            projectCfg.enabledRules = projectCfg.enabledRules.filter((id) => id !== ruleId);
        }
        if (projectCfg.disabledRules) {
            projectCfg.disabledRules = projectCfg.disabledRules.filter((id) => id !== ruleId);
        }
        if (projectCfg.ruleOverrides && Object.prototype.hasOwnProperty.call(projectCfg.ruleOverrides, ruleId)) {
            delete projectCfg.ruleOverrides[ruleId];
        }
    }
    savePolicyConfig(cfg, workspacePath);
}
function resolveEnabledRules(projectId, workspacePath) {
    const cfg = loadPolicyConfig(workspacePath);
    const defaults = new Set(cfg.defaultEnabledRules || []);
    const projectCfg = cfg.projects?.[projectId];
    if (!projectCfg)
        return defaults;
    const set = new Set(projectCfg.enabledRules || Array.from(defaults));
    for (const id of projectCfg.disabledRules || [])
        set.delete(id);
    return set;
}
function getProjectPolicy(projectId, workspacePath) {
    const cfg = loadPolicyConfig(workspacePath);
    const defaults = cfg.defaultEnabledRules || [];
    const projectCfg = cfg.projects?.[projectId] || {};
    const executionProfile = normalizeExecutionProfile(projectCfg.executionProfile);
    return {
        projectId,
        defaultEnabledRules: defaults,
        enabledRules: projectCfg.enabledRules || defaults,
        disabledRules: projectCfg.disabledRules || [],
        ruleOverrides: projectCfg.ruleOverrides || {},
        executionProfile,
        gitPolicy: buildEffectiveGitPolicy(executionProfile, projectCfg.gitPolicy),
    };
}
function updateProjectPolicy(projectId, patch, workspacePath) {
    const cfg = loadPolicyConfig(workspacePath);
    if (!cfg.projects)
        cfg.projects = {};
    const prev = cfg.projects[projectId] || {};
    cfg.projects[projectId] = {
        ...prev,
        ...(patch.enabledRules ? { enabledRules: patch.enabledRules } : {}),
        ...(patch.disabledRules ? { disabledRules: patch.disabledRules } : {}),
        ...(patch.ruleOverrides ? { ruleOverrides: patch.ruleOverrides } : {}),
        ...(patch.executionProfile ? { executionProfile: normalizeExecutionProfile(patch.executionProfile) } : {}),
        ...(patch.gitPolicy ? { gitPolicy: patch.gitPolicy } : {}),
    };
    savePolicyConfig(cfg, workspacePath);
    return getProjectPolicy(projectId, workspacePath);
}
function resolveProjectExecutionProfile(projectId, workspacePath) {
    return getProjectPolicy(projectId, workspacePath).executionProfile;
}
function resolveProjectGitPolicy(projectId, workspacePath) {
    return getProjectPolicy(projectId, workspacePath).gitPolicy;
}
