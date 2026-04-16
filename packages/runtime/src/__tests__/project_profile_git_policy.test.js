"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const governance_1 = require("@system/governance");
function mkWorkspace() {
    const root = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'project-profile-'));
    fs_1.default.mkdirSync(path_1.default.join(root, 'docs/runtime/governance'), { recursive: true });
    fs_1.default.writeFileSync(path_1.default.join(root, 'docs/runtime/governance/rule-registry.yaml'), [
        'rules:',
        '  - id: git_preflight',
        '    triggerPhases: [BEFORE_RUN]',
        '    evidence: [docs/process/git/preflights/<ticket>.env]',
        '    evaluationType: deterministic',
        '    deterministicCheck: preflight_token',
        '    enforcementMode: hard',
        '    enabledByDefault: true',
        '',
    ].join('\n'), 'utf-8');
    return root;
}
describe('Project profile and git policy integration', () => {
    it('uses engineering defaults when profile is not set', () => {
        const workspace = mkWorkspace();
        const profile = (0, governance_1.resolveProjectExecutionProfile)('agent_system', workspace);
        const gitPolicy = (0, governance_1.resolveProjectGitPolicy)('agent_system', workspace);
        expect(profile).toBe('engineering');
        expect(gitPolicy.requirePreflightToken).toBe(true);
        expect(gitPolicy.requireWorktreeIsolation).toBe(true);
        expect(gitPolicy.allowGitMutations).toBe(true);
    });
    it('switches to non-engineering defaults and keeps project-scoped policy', () => {
        const workspace = mkWorkspace();
        (0, governance_1.updateProjectPolicy)('marketing', {
            executionProfile: 'non_engineering',
        }, workspace);
        const marketing = (0, governance_1.getProjectPolicy)('marketing', workspace);
        const engineering = (0, governance_1.getProjectPolicy)('agent_system', workspace);
        expect(marketing.executionProfile).toBe('non_engineering');
        expect(marketing.gitPolicy.requirePreflightToken).toBe(false);
        expect(marketing.gitPolicy.requireWorktreeIsolation).toBe(false);
        expect(engineering.executionProfile).toBe('engineering');
        expect(engineering.gitPolicy.requirePreflightToken).toBe(true);
    });
    it('allows profile-driven git policy overrides', () => {
        const workspace = mkWorkspace();
        (0, governance_1.updateProjectPolicy)('marketing', {
            executionProfile: 'non_engineering',
            gitPolicy: {
                allowGitMutations: true,
            },
        }, workspace);
        const policy = (0, governance_1.resolveProjectGitPolicy)('marketing', workspace);
        expect(policy.requirePreflightToken).toBe(false);
        expect(policy.allowGitMutations).toBe(true);
    });
});
