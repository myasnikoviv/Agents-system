import * as fs from 'fs';
import * as path from 'path';
import { MarkdownInterpreter } from './interpreters/MarkdownInterpreter';
import { AgentRegistry, AgentProfile } from './registries/AgentRegistry';
import { PipelineRegistry, PipelineDefinition, PipelineStage } from './registries/PipelineRegistry';
import { SkillRegistry, SkillProfile } from './registries/SkillRegistry';
import { loadGovernanceLoops, loadGovernanceLoopsFromDisk } from '@system/governance';
import { parseMeetingSpecFromContent } from './meeting/MeetingSpec';
import { loadGovernanceRules } from '@system/governance';
import { loadPolicyConfig } from '@system/governance';

export { 
  AgentRegistry, AgentProfile, 
  PipelineRegistry, PipelineDefinition, PipelineStage, 
  SkillRegistry, SkillProfile 
};

export class DynamicDiscoveryService {
  private static defaultDocsPath = path.join(process.cwd(), 'docs');
  private static defaultManifestPath = path.join(process.cwd(), 'AGENTS.md');
  private static resolveFromManifestPath(manifestRoot: string, relPath: string, externalAgentsRoot?: string): string {
    const direct = path.resolve(manifestRoot, relPath);
    if (fs.existsSync(direct)) return direct;
    if (externalAgentsRoot && relPath.startsWith('./common-agents/')) {
      const suffix = relPath.replace(/^\.\/common-agents\/?/, '');
      const remapped = path.resolve(externalAgentsRoot, suffix);
      if (fs.existsSync(remapped)) return remapped;
    }
    return direct;
  }

  static async discoverAll(projectRoot?: string, options?: { externalAgentsRoot?: string, forceRefresh?: boolean }) {
    const root = projectRoot || process.cwd();
    
    // AGSYS-3508: Check if registry is already hydrated (unless forceRefresh is true)
    if (!options?.forceRefresh && AgentRegistry.getAllAgents().length > 0) {
      console.log('[DynamicDiscoveryService] Registry already hydrated, skipping discovery.');
      return;
    }

    const docsPath = path.join(root, 'docs');
    const manifestPath = path.join(root, 'AGENTS.md');
    const fromManifest = this.parseManifestMetadata(
      fs.existsSync(manifestPath) ? manifestPath : this.defaultManifestPath,
      options,
    );
    const externalDocsPath = options?.externalAgentsRoot ? path.join(options.externalAgentsRoot, 'docs') : '';
    const defaultDocsPath = externalDocsPath && fs.existsSync(externalDocsPath) ? externalDocsPath : docsPath;

    if (fromManifest.agents.length > 0) {
      await this.discoverAgentsFromFiles(fromManifest.agents, fromManifest.callsignsBySlug);
    } else {
      await this.discoverAgents(defaultDocsPath);
    }

    if (fromManifest.pipelines.length > 0) {
      await this.discoverPipelinesFromFiles(fromManifest.pipelines);
    } else {
      await this.discoverPipelines(defaultDocsPath);
    }

    if (fromManifest.skills.length > 0) {
      await this.discoverSkillsFromFiles(fromManifest.skills);
    } else {
      await this.discoverSkills(defaultDocsPath);
    }

    // AGSYS-35R: Extended Discovery
    await this.discoverLoops(root);
    await this.discoverMeetingSpecs(root);
    await this.discoverGovernanceRules(root);
    await this.discoverGovernanceProfiles(root);
  }

  static async discoverSpecific(filePath: string, type: string) {
    if (!fs.existsSync(filePath)) return;
    
    // Break circular dependency with dynamic require
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    
    switch (type) {
      case 'agent':
        await this.discoverAgentsFromFiles([filePath]);
        break;
      case 'pipeline':
        await this.discoverPipelinesFromFiles([filePath]);
        break;
      case 'skill':
        await this.discoverSkillsFromFiles([filePath]);
        break;
      case 'meeting_spec':
        const content = fs.readFileSync(filePath, 'utf-8');
        const ext = path.extname(filePath).toLowerCase() as '.yaml' | '.yml' | '.md';
        const spec = parseMeetingSpecFromContent(content, ext);
        await assetRegistryV2.registerAsset({
          type: 'meeting_spec',
          slug: path.basename(filePath, ext),
          path: filePath,
          name: `Meeting Spec: ${path.basename(filePath, ext)}`,
          metadata: { status: 'active', approval_state: 'approved' },
          attributes: spec
        });
        break;
      case 'loop':
        // Loops are currently in a bulk file, but if we have a path to it, we re-discover all loops in it
        await this.discoverLoops(path.dirname(path.dirname(filePath))); // Resolve root from path
        break;
    }
  }

  static async discoverAgents(docsPath: string = this.defaultDocsPath) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    AgentRegistry.clear();
    const agentsDir = path.join(docsPath, 'agents');
    if (!fs.existsSync(agentsDir)) return;

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(agentsDir, file);
      const parsed = MarkdownInterpreter.parse(filePath);
      const slug = path.basename(file, '.md');
      
      // Extract from sections
      const name = this.normalizeInlineLabel((parsed.raw.split('\n')[0] || '').replace('#', '').trim());
      const callsign = this.normalizeInlineLabel((parsed.sections['Callsign'] || '').trim()) || name;
      const mission = (parsed.sections['Mission'] || parsed.sections['Purpose'] || '').trim();
      const owns = this.extractList(parsed.sections['Owns']);
      const guardrails = this.extractList(parsed.sections['Guardrails']);
      const skills = this.extractList(parsed.sections['Skills'] || parsed.sections['Related Skills']);
      const tools = this.extractList(parsed.sections['Tools']);

      const profile: AgentProfile = {
        slug,
        name,
        title: name,
        callsign,
        mission,
        description: mission,
        instructions: parsed.raw,
        owns,
        guardrails,
        skills,
        tools,
        fullInstructions: parsed.raw,
        sourcePath: filePath
      };

      AgentRegistry.register(profile);
      
      // AGSYS-3503: Register as first-class asset
      profile.assetId = await assetRegistryV2.registerAsset({
        type: 'agent',
        slug: profile.slug,
        path: profile.sourcePath,
        name: profile.name,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: profile
      });
    }
  }

  static async discoverAgentsFromFiles(files: string[], callsignsBySlug?: Record<string, string>) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    AgentRegistry.clear();
    const uniqueFiles = Array.from(new Set(files)).filter((f) => fs.existsSync(f));
    for (const filePath of uniqueFiles) {
      const parsed = MarkdownInterpreter.parse(filePath);
      const slug = path.basename(filePath, '.md');

      const name = this.normalizeInlineLabel((parsed.raw.split('\n')[0] || '').replace('#', '').trim());
      const callsign =
        this.normalizeInlineLabel((callsignsBySlug?.[slug] || '').trim()) ||
        this.normalizeInlineLabel((parsed.sections['Callsign'] || '').trim()) ||
        name;
      const mission = (parsed.sections['Mission'] || parsed.sections['Purpose'] || '').trim();
      const owns = this.extractList(parsed.sections['Owns']);
      const guardrails = this.extractList(parsed.sections['Guardrails']);
      const skills = this.extractList(parsed.sections['Skills'] || parsed.sections['Related Skills']);
      const tools = this.extractList(parsed.sections['Tools']);

      const profile: AgentProfile = {
        slug,
        name,
        title: name,
        callsign,
        mission,
        description: mission,
        instructions: parsed.raw,
        owns,
        guardrails,
        skills,
        tools,
        fullInstructions: parsed.raw,
        sourcePath: filePath,
      };

      AgentRegistry.register(profile);

      // AGSYS-3503: Register as first-class asset
      profile.assetId = await assetRegistryV2.registerAsset({
        type: 'agent',
        slug: profile.slug,
        path: profile.sourcePath,
        name: profile.name,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: profile
      });
    }
  }

  static async discoverPipelines(docsPath: string = this.defaultDocsPath) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    PipelineRegistry.clear();
    const pipelinesDir = path.join(docsPath, 'pipelines');
    if (!fs.existsSync(pipelinesDir)) return;

    const files = fs.readdirSync(pipelinesDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(pipelinesDir, file);
      const parsed = MarkdownInterpreter.parse(filePath);
      const id = path.basename(file, '.md');

      const name = (parsed.raw.split('\n')[0] || '').replace('# Pipeline:', '').trim();
      const stages = this.parsePipelineStages(
        parsed.sections['Steps'] ||
        parsed.sections['Full Path'] ||
        parsed.sections['Lightweight Path'] ||
        ''
      );

      const profile: PipelineDefinition = {
        id,
        slug: id,
        name,
        title: name,
        description: parsed.sections['Goal'] || '',
        stages,
        sourcePath: filePath
      };

      PipelineRegistry.register(profile);

      // AGSYS-3503: Register as first-class asset
      profile.assetId = await assetRegistryV2.registerAsset({
        type: 'pipeline',
        slug: profile.slug,
        path: profile.sourcePath,
        name: profile.name,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: profile
      });
    }
  }

  static async discoverPipelinesFromFiles(files: string[]) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    PipelineRegistry.clear();
    const uniqueFiles = Array.from(new Set(files)).filter((f) => fs.existsSync(f));
    for (const filePath of uniqueFiles) {
      const parsed = MarkdownInterpreter.parse(filePath);
      const id = path.basename(filePath, '.md');

      const name = (parsed.raw.split('\n')[0] || '').replace('# Pipeline:', '').trim();
      const stages = this.parsePipelineStages(
        parsed.sections['Steps'] ||
        parsed.sections['Full Path'] ||
        parsed.sections['Lightweight Path'] ||
        ''
      );

      const profile: PipelineDefinition = {
        id,
        slug: id,
        name,
        title: name,
        description: parsed.sections['Goal'] || '',
        stages,
        sourcePath: filePath,
      };

      PipelineRegistry.register(profile);

      // AGSYS-3503: Register as first-class asset
      profile.assetId = await assetRegistryV2.registerAsset({
        type: 'pipeline',
        slug: profile.slug,
        path: profile.sourcePath,
        name: profile.name,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: profile
      });
    }
  }

  static async discoverSkills(docsPath: string = this.defaultDocsPath) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    SkillRegistry.clear();
    const skillsDir = path.join(docsPath, 'skills');
    if (!fs.existsSync(skillsDir)) return;

    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(skillsDir, file);
      const parsed = MarkdownInterpreter.parse(filePath);
      const id = path.basename(file, '.md');

      const name = parsed.sections['Skill Name'] || id;
      const tools = this.extractList(parsed.sections['Tools'] || parsed.sections['Outputs']); // Fallback

      const profile: SkillProfile = {
        id,
        name,
        description: parsed.sections['Purpose'] || '',
        tools,
        usageGuidelines: parsed.sections['When To Use'] || '',
        sourcePath: filePath
      };

      SkillRegistry.register(profile);

      // AGSYS-3503: Register as first-class asset
      profile.assetId = await assetRegistryV2.registerAsset({
        type: 'skill',
        slug: profile.id,
        path: profile.sourcePath,
        name: profile.name,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: profile
      });
    }
  }

  static async discoverSkillsFromFiles(files: string[]) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    SkillRegistry.clear();
    const uniqueFiles = Array.from(new Set(files)).filter((f) => fs.existsSync(f));
    for (const filePath of uniqueFiles) {
      const parsed = MarkdownInterpreter.parse(filePath);
      const id = path.basename(filePath, '.md');

      const name = parsed.sections['Skill Name'] || id;
      const tools = this.extractList(parsed.sections['Tools'] || parsed.sections['Outputs']);

      const profile: SkillProfile = {
        id,
        name,
        description: parsed.sections['Purpose'] || '',
        tools,
        usageGuidelines: parsed.sections['When To Use'] || '',
        sourcePath: filePath,
      };

      SkillRegistry.register(profile);

      // AGSYS-3503: Register as first-class asset
      profile.assetId = await assetRegistryV2.registerAsset({
        type: 'skill',
        slug: profile.id,
        path: profile.sourcePath,
        name: profile.name,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: profile
      });
    }
  }

  static async discoverLoops(root: string) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    const loops = loadGovernanceLoopsFromDisk(root);
    for (const loop of loops) {
      await assetRegistryV2.registerAsset({
        type: 'loop',
        slug: loop.id,
        path: 'docs/runtime/governance/loop-catalog.json',
        name: loop.metadata?.name || loop.id,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: loop
      });
    }
  }

  static async discoverMeetingSpecs(root: string) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    const meetingsDir = path.join(root, 'docs/runtime/meetings');
    if (!fs.existsSync(meetingsDir)) return;

    const files = fs.readdirSync(meetingsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.md'));
    for (const file of files) {
      if (file.startsWith('validation-rules')) continue;
      
      const filePath = path.join(meetingsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(file).toLowerCase() as '.yaml' | '.yml' | '.md';
      
      try {
        const spec = parseMeetingSpecFromContent(content, ext);
        await assetRegistryV2.registerAsset({
          type: 'meeting_spec',
          slug: path.basename(file, ext),
          path: filePath,
          name: `Meeting Spec: ${path.basename(file, ext)}`,
          metadata: { status: 'active', approval_state: 'approved' },
          attributes: spec
        });
      } catch (e) {
        console.error(`[DynamicDiscoveryService] Failed to parse meeting spec ${file}:`, e);
      }
    }
  }

  static async discoverGovernanceRules(root: string) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    const rules = loadGovernanceRules(root);
    for (const rule of rules) {
      await assetRegistryV2.registerAsset({
        type: 'governance_rule',
        slug: rule.id,
        path: 'docs/runtime/governance/rule-registry.yaml',
        name: rule.metadata?.name || rule.id,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: rule
      });
    }
  }

  static async discoverGovernanceProfiles(root: string) {
    const { assetRegistryV2 } = require('./registries/AssetRegistryV2');
    const config = loadPolicyConfig(root);
    const projectIds = Object.keys(config.projects || {});
    
    // Always register default profile even if no projects defined
    await assetRegistryV2.registerAsset({
      type: 'governance_profile',
      slug: 'default',
      path: 'docs/runtime/governance/project-policy.json',
      name: 'Default Governance Profile',
      metadata: { status: 'active', approval_state: 'approved' },
      attributes: { defaultEnabledRules: config.defaultEnabledRules }
    });

    for (const projectId of projectIds) {
      const projectPolicy = config.projects![projectId];
      await assetRegistryV2.registerAsset({
        type: 'governance_profile',
        slug: projectId,
        path: 'docs/runtime/governance/project-policy.json',
        name: `Project Profile: ${projectId}`,
        metadata: { status: 'active', approval_state: 'approved' },
        attributes: projectPolicy
      });
    }
  }

  private static parseManifestMetadata(manifestPath: string, options?: { externalAgentsRoot?: string }): {
    agents: string[];
    pipelines: string[];
    skills: string[];
    callsignsBySlug: Record<string, string>;
  } {
    if (!manifestPath || !fs.existsSync(manifestPath)) {
      return { agents: [], pipelines: [], skills: [], callsignsBySlug: {} };
    }

    const root = path.dirname(manifestPath);
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const agents: string[] = [];
    const pipelines: string[] = [];
    const skills: string[] = [];
    const callsignsBySlug: Record<string, string> = {};

    const allTickedPaths = Array.from(raw.matchAll(/`(\.\/[^`]+\.md)`/g)).map((m) => m[1]);
    for (const relPath of allTickedPaths) {
      const abs = this.resolveFromManifestPath(root, relPath, options?.externalAgentsRoot);
      if (relPath.includes('/agents/')) agents.push(abs);
      else if (relPath.includes('/pipelines/')) pipelines.push(abs);
      else if (relPath.includes('/skills/')) skills.push(abs);
    }

    const sectionMatches = Array.from(
      raw.matchAll(/-\s*Callsign:\s*`([^`]+)`[\s\S]*?-\s*File:\s*`(\.\/[^`]+\/agents\/[^`]+\.md)`/g),
    );
    for (const match of sectionMatches) {
      const callsign = this.normalizeInlineLabel((match[1] || '').trim());
      const relAgentPath = (match[2] || '').trim();
      if (!callsign || !relAgentPath) continue;
      const slug = path.basename(relAgentPath, '.md');
      if (!slug) continue;
      callsignsBySlug[slug] = callsign;
    }

    return {
      agents: Array.from(new Set(agents)),
      pipelines: Array.from(new Set(pipelines)),
      skills: Array.from(new Set(skills)),
      callsignsBySlug,
    };
  }

  private static extractList(section: string | undefined): string[] {
    if (!section) return [];
    return section.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .map(line => line.replace(/`/g, '')); // Remove backticks from skill names
  }

  private static normalizeInlineLabel(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const unwrapped = raw.replace(/^`+|`+$/g, '').trim();
    return unwrapped;
  }

  private static parsePipelineStages(stepsSection: string): PipelineStage[] {
    const stages: PipelineStage[] = [];
    const lines = stepsSection.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      // Matches "1. Role: ..." or "1.1 Role: ..." or "1.1. Role: ..."
      const match = line.match(/^(\d+(\.\d+)*)\.?\s+([^:]+):\s*(.*)/);
      if (match && match[1] && match[3] && match[4]) {
        const roleName = match[3].trim();
        const description = match[4].trim();
        stages.push({
          id: match[1],
          name: `${roleName} Stage`,
          title: `${roleName} Stage`,
          role: roleName,
          agent: this.normalizeRoleToSlug(roleName),
          description: description,
          instructions: description, // Default instructions to description for now
          nextAllowedRoles: [], // Will be handled by PipelineRegistry.getNextStage
          completionCriteria: ''
        });
        continue;
      }

      // Matches "1. Intake (PM)" or "2. Clarification (PM + Architect)"
      const parenMatch = line.match(/^(\d+(\.\d+)*)\.\s+(.+?)\s+\((.+)\)\s*$/);
      if (parenMatch && parenMatch[1] && parenMatch[3] && parenMatch[4]) {
        const stepId = parenMatch[1].trim();
        const stepTitle = parenMatch[3].trim();
        const roleRaw = parenMatch[4].split('+')[0]?.split('/')[0]?.split(',')[0]?.trim() || 'PM';
        stages.push({
          id: stepId,
          name: `${stepTitle} Stage`,
          title: `${stepTitle} Stage`,
          role: roleRaw,
          agent: this.normalizeRoleToSlug(roleRaw),
          description: stepTitle,
          instructions: stepTitle,
          nextAllowedRoles: [],
          completionCriteria: ''
        });
      }
    }

    // Safety net: if parsed pipeline is still empty, start with PM to avoid wrong entry role.
    if (stages.length === 0) {
      stages.push({
        id: '1',
        name: 'Intake Stage',
        title: 'Intake Stage',
        role: 'PM Orchestrator',
        agent: 'pm-orchestrator',
        description: 'Fallback intake stage',
        instructions: 'Fallback intake stage',
        nextAllowedRoles: [],
        completionCriteria: ''
      });
    }
    return stages;
  }

  private static normalizeRoleToSlug(role: string): string {
    const normalized = role.toLowerCase().replace(/\s+/g, ' ').trim();
    const aliasMap: Record<string, string> = {
      'pm': 'pm-orchestrator',
      'pm orchestrator': 'pm-orchestrator',
      'pm orchestrator / supervisor': 'pm-orchestrator',
      'supervisor': 'pm-orchestrator',
      'research': 'research-agent',
      'research agent': 'research-agent',
      'trader': 'trader-analyst',
      'trader analyst': 'trader-analyst',
      'solution architect': 'solution-architect',
      'architect': 'solution-architect',
      'tdd qa': 'tdd-qa',
      'qa': 'tdd-qa',
      'developer': 'developer',
      'code reviewer': 'code-reviewer',
      'reviewer': 'code-reviewer',
      'runner': 'runner-backtest',
      'runner backtest': 'runner-backtest',
      'knowledge curator': 'knowledge-curator',
      'learning agent': 'knowledge-curator',
      'domain validator': 'domain-validator',
      'git flow manager': 'git-flow-manager',
      'git': 'git-flow-manager',
      'documentation owner': 'documentation-owner',
      'docs': 'documentation-owner',
      'devops engineer': 'devops-engineer',
      'devops': 'devops-engineer',
      'design lead': 'design-lead',
      'ui ux authority': 'design-lead',
    };

    if (aliasMap[normalized]) return aliasMap[normalized];
    return normalized.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  }
}
