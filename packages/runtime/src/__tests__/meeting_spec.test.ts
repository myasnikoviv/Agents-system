import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseMeetingSpecFromContent, resolveMeetingSpec } from '../meeting/MeetingSpec';

describe('MeetingSpec', () => {
  it('parses valid YAML spec', () => {
    const spec = parseMeetingSpecFromContent(
      [
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
      ].join('\n'),
      '.yaml',
    );
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
    const spec = parseMeetingSpecFromContent(md, '.md');
    expect(spec.mode).toBe('review');
  });

  it('fails when required rule is missing', () => {
    expect(() =>
      parseMeetingSpecFromContent(
        [
          'pipeline: meeting',
          'mode: debate',
          'participants: [architect, reviewer]',
          'moderator: architect',
          'rounds: 2',
          'turn_strategy: round_robin',
          'rules:',
          '  - reviewer_must_provide_risks',
          'artifacts: [decision]',
        ].join('\n'),
        '.yaml',
      ),
    ).toThrow(/missing required meeting rule/i);
  });

  it('resolves meeting spec from workspace docs path', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-spec-'));
    const specPath = path.join(tmp, 'docs/runtime/meetings/meeting-spec.yaml');
    fs.mkdirSync(path.dirname(specPath), { recursive: true });
    fs.writeFileSync(
      specPath,
      [
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
      ].join('\n'),
      'utf-8',
    );
    const spec = resolveMeetingSpec(tmp);
    expect(spec.mode).toBe('alignment');
  });

  it('uses declarative validation rules from workspace config', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-spec-rules-'));
    const specPath = path.join(tmp, 'docs/runtime/meetings/meeting-spec.yaml');
    const rulesPath = path.join(tmp, 'docs/runtime/meetings/validation-rules.yaml');
    fs.mkdirSync(path.dirname(specPath), { recursive: true });
    fs.writeFileSync(
      rulesPath,
      [
        'requiredRules:',
        '  - reviewer_must_provide_risks',
        'requiredArtifacts:',
        '  - decision',
      ].join('\n'),
      'utf-8',
    );
    fs.writeFileSync(
      specPath,
      [
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
      ].join('\n'),
      'utf-8',
    );

    expect(() => resolveMeetingSpec(tmp)).toThrow(/missing required meeting rule: reviewer_must_provide_risks/i);
  });
});
