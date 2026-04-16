"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProjectRuntimeManifestLoader_1 = require("../ProjectRuntimeManifestLoader");
const ProjectRuntimeManifestValidator_1 = require("../ProjectRuntimeManifestValidator");
describe('ProjectRuntimeManifest', () => {
    it('loads manifest from current project and passes validation', async () => {
        const manifest = await (0, ProjectRuntimeManifestLoader_1.loadProjectRuntimeManifest)({ projectRoot: process.cwd() });
        expect(manifest.manifestVersion).toBe('1.0');
        expect(manifest.agents.length).toBeGreaterThan(0);
        expect(manifest.skills.length).toBeGreaterThan(0);
        expect(manifest.pipelines.length).toBeGreaterThan(0);
        expect(manifest.policies.gates.length).toBeGreaterThan(0);
        const issues = (0, ProjectRuntimeManifestValidator_1.validateProjectRuntimeManifest)(manifest);
        const errors = issues.filter((i) => i.severity === 'error');
        expect(errors).toEqual([]);
    });
    it('flags invalid default count', async () => {
        const manifest = await (0, ProjectRuntimeManifestLoader_1.loadProjectRuntimeManifest)({ projectRoot: process.cwd() });
        for (const p of manifest.pipelines) {
            p.default = false;
        }
        const issues = (0, ProjectRuntimeManifestValidator_1.validateProjectRuntimeManifest)(manifest);
        expect(issues.some((i) => i.code === 'invalid_default_count')).toBe(true);
    });
});
