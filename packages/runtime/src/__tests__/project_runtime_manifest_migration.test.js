"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ProjectRuntimeManifestLoader_1 = require("../ProjectRuntimeManifestLoader");
const ProjectRuntimeManifestMigration_1 = require("../ProjectRuntimeManifestMigration");
describe('ProjectRuntimeManifestMigration', () => {
    it('generates canonical bundle and loader consumes it', async () => {
        const tmpRoot = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'runtime-manifest-migration-'));
        const projectRoot = path_1.default.join(tmpRoot, 'sample-project');
        await promises_1.default.mkdir(path_1.default.join(projectRoot, 'docs', 'agents'), { recursive: true });
        await promises_1.default.mkdir(path_1.default.join(projectRoot, 'docs', 'skills'), { recursive: true });
        await promises_1.default.mkdir(path_1.default.join(projectRoot, 'docs', 'pipelines'), { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(projectRoot, 'docs', 'agents', 'pm-orchestrator.md'), ['# PM Orchestrator', '', '## Guardrails', '- Always select a pipeline first.', '', '## MCP Servers', '- `plane`'].join('\n'), 'utf-8');
        await promises_1.default.writeFile(path_1.default.join(projectRoot, 'docs', 'skills', 'pm-orchestrator-skill.md'), ['# PM Skill', '', '## When To Use', '- Intake requests.', '', '## Constraints', '- Keep audit trail.'].join('\n'), 'utf-8');
        await promises_1.default.writeFile(path_1.default.join(projectRoot, 'docs', 'pipelines', 'unified-task-intake.md'), ['# Unified Task Intake', '', '## Steps', '1. PM intake and classify request.', '2. PM select pipeline.'].join('\n'), 'utf-8');
        const migration = await (0, ProjectRuntimeManifestMigration_1.generateCanonicalRuntimeManifestBundle)({ projectRoot });
        const bundleRaw = await promises_1.default.readFile(migration.outputPath, 'utf-8');
        const bundle = JSON.parse(bundleRaw);
        expect(bundle.metadata?.migration).toBe('markdown-to-canonical-bundle-v1');
        await promises_1.default.writeFile(migration.outputPath, JSON.stringify({
            ...JSON.parse(bundleRaw),
            metadata: { source: 'canonical-test-bundle' },
        }, null, 2) + '\n', 'utf-8');
        const loaded = await (0, ProjectRuntimeManifestLoader_1.loadProjectRuntimeManifest)({ projectRoot, preferCanonicalBundle: true });
        expect(loaded.metadata?.source).toBe('canonical-test-bundle');
    });
});
