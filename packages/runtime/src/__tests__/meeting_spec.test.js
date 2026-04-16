"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const MeetingSpec_1 = require("../meeting/MeetingSpec");
describe('MeetingSpec', () => {
    it('parses valid YAML spec', () => {
        const spec = (0, MeetingSpec_1.parseMeetingSpecFromContent)([
            'pipeline: meeting',
            'mode: debate',
            'participants: [architect, reviewer, devops]',
            'moderator: architect',
            'rounds: 2',
            'turn_strategy: round_robin',
            'rules:',
            '  - each_agent_must_provide_argument',
            '  - moderator_must_finalize_decision',
            'artifacts: [decision, risks]',
        ].join('\n'), '.yaml');
        expect(spec.pipeline).toBe('meeting');
        expect(spec.moderator).toBe('architect');
        expect(spec.rounds).toBe(2);
    });
    it('parses Markdown frontmatter spec', () => {
        const md = [
            '---',
            'pipeline: meeting',
            'mode: review',
            'participants: [architect, reviewer]',
            'moderator: reviewer',
            'rounds: 1',
            'turn_strategy: round_robin',
            'rules:',
            '  - each_agent_must_provide_argument',
            '  - moderator_must_finalize_decision',
            'artifacts: [decision]',
            '---',
            '',
            '# meeting',
        ].join('\n');
        const spec = (0, MeetingSpec_1.parseMeetingSpecFromContent)(md, '.md');
        expect(spec.mode).toBe('review');
    });
    it('fails when required rule is missing', () => {
        expect(() => (0, MeetingSpec_1.parseMeetingSpecFromContent)([
            'pipeline: meeting',
            'mode: debate',
            'participants: [architect, reviewer]',
            'moderator: architect',
            'rounds: 2',
            'turn_strategy: round_robin',
            'rules:',
            '  - reviewer_must_provide_risks',
            'artifacts: [decision]',
        ].join('\n'), '.yaml')).toThrow(/missing required meeting rule/i);
    });
    it('resolves meeting spec from workspace docs path', () => {
        const tmp = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'meeting-spec-'));
        const specPath = path_1.default.join(tmp, 'docs/runtime/meetings/meeting-spec.yaml');
        fs_1.default.mkdirSync(path_1.default.dirname(specPath), { recursive: true });
        fs_1.default.writeFileSync(specPath, [
            'pipeline: meeting',
            'mode: alignment',
            'participants: [architect, reviewer]',
            'moderator: architect',
            'rounds: 1',
            'turn_strategy: round_robin',
            'rules:',
            '  - each_agent_must_provide_argument',
            '  - moderator_must_finalize_decision',
            'artifacts: [decision]',
        ].join('\n'), 'utf-8');
        const spec = (0, MeetingSpec_1.resolveMeetingSpec)(tmp);
        expect(spec.mode).toBe('alignment');
    });
    it('uses declarative validation rules from workspace config', () => {
        const tmp = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'meeting-spec-rules-'));
        const specPath = path_1.default.join(tmp, 'docs/runtime/meetings/meeting-spec.yaml');
        const rulesPath = path_1.default.join(tmp, 'docs/runtime/meetings/validation-rules.yaml');
        fs_1.default.mkdirSync(path_1.default.dirname(specPath), { recursive: true });
        fs_1.default.writeFileSync(rulesPath, [
            'requiredRules:',
            '  - reviewer_must_provide_risks',
            'requiredArtifacts:',
            '  - decision',
        ].join('\n'), 'utf-8');
        fs_1.default.writeFileSync(specPath, [
            'pipeline: meeting',
            'mode: debate',
            'participants: [architect, reviewer]',
            'moderator: architect',
            'rounds: 1',
            'turn_strategy: round_robin',
            'rules:',
            '  - each_agent_must_provide_argument',
            '  - moderator_must_finalize_decision',
            'artifacts: [decision]',
        ].join('\n'), 'utf-8');
        expect(() => (0, MeetingSpec_1.resolveMeetingSpec)(tmp)).toThrow(/missing required meeting rule: reviewer_must_provide_risks/i);
    });
});
