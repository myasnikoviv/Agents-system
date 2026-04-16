"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGovernanceDataModelSnapshot = buildGovernanceDataModelSnapshot;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RuleRegistry_1 = require("./RuleRegistry");
const LoopRegistry_1 = require("./LoopRegistry");
const ManualOverrideRegistry_1 = require("./ManualOverrideRegistry");
const ProjectPolicyBinding_1 = require("./ProjectPolicyBinding");
function toRelative(root, absolutePath) {
    return path_1.default.relative(root, absolutePath).replace(/\\/g, '/');
}
function collectArtifactEntities(workspacePath) {
    const root = workspacePath || process.cwd();
    const probes = [
        { category: 'compliance', file: path_1.default.resolve(root, 'docs/process/runs/compliance') },
        { category: 'cost', file: path_1.default.resolve(root, 'docs/process/runs/cost') },
        { category: 'adaptive', file: path_1.default.resolve(root, 'docs/process/runs/adaptive') },
        { category: 'improvement', file: path_1.default.resolve(root, 'docs/process/improvements') },
        { category: 'ledger', file: path_1.default.resolve(root, 'docs/process/runs/ledger') },
        { category: 'governance-log', file: path_1.default.resolve(root, 'docs/runtime/governance/logs') },
    ];
    return probes.map((probe) => ({
        category: probe.category,
        relativePath: toRelative(root, probe.file),
        exists: fs_1.default.existsSync(probe.file),
    }));
}
function buildGovernanceDataModelSnapshot(input = {}) {
    const workspacePath = input.workspacePath || process.cwd();
    const projectIds = (input.projectIds || []).filter(Boolean);
    return {
        rules: (0, RuleRegistry_1.loadGovernanceRules)(workspacePath),
        loops: (0, LoopRegistry_1.loadGovernanceLoops)(workspacePath),
        profiles: projectIds.map((projectId) => {
            const policy = (0, ProjectPolicyBinding_1.getProjectPolicy)(projectId, workspacePath);
            return {
                projectId: policy.projectId,
                executionProfile: policy.executionProfile,
                gitPolicy: policy.gitPolicy,
                enabledRules: policy.enabledRules,
                disabledRules: policy.disabledRules,
            };
        }),
        overrides: (0, ManualOverrideRegistry_1.listManualOverrides)(workspacePath),
        artifacts: collectArtifactEntities(workspacePath),
    };
}
