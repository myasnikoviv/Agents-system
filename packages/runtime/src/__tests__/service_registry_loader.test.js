"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ServiceRegistryLoader_1 = require("../control-plane/ServiceRegistryLoader");
describe('ServiceRegistryLoader (AGSYS-2702)', () => {
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'service-registry-loader-'));
    afterAll(() => {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch {
            // no-op
        }
    });
    it('loads valid JSON registry', () => {
        const file = path_1.default.join(tmpDir, 'registry.json');
        fs_1.default.writeFileSync(file, JSON.stringify({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: { type: 'api', runtime: 'node', desired: 'running' },
            },
        }, null, 2), 'utf-8');
        const loaded = (0, ServiceRegistryLoader_1.loadServiceRegistry)(file);
        expect(loaded.registry.services.backend.type).toBe('api');
    });
    it('loads valid YAML registry', () => {
        const file = path_1.default.join(tmpDir, 'registry.yaml');
        fs_1.default.writeFileSync(file, [
            'schemaVersion: service-registry.v1',
            'services:',
            '  runtime-dispatcher:',
            '    type: worker',
            '    runtime: node',
            '    desired: running',
        ].join('\n'), 'utf-8');
        const loaded = (0, ServiceRegistryLoader_1.loadServiceRegistry)(file);
        expect(loaded.registry.services['runtime-dispatcher'].type).toBe('worker');
    });
    it('throws on invalid registry shape', () => {
        const file = path_1.default.join(tmpDir, 'invalid.json');
        fs_1.default.writeFileSync(file, JSON.stringify({
            schemaVersion: 'service-registry.v1',
            services: {
                redis: { type: 'unknown', runtime: 'docker', desired: 'running' },
            },
        }, null, 2), 'utf-8');
        expect(() => (0, ServiceRegistryLoader_1.loadServiceRegistry)(file)).toThrow('service_registry_schema_validation_failed');
    });
    it('supports basic dynamic reload via watch', async () => {
        const file = path_1.default.join(tmpDir, 'watch.json');
        fs_1.default.writeFileSync(file, JSON.stringify({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: { type: 'api', runtime: 'node', desired: 'running' },
            },
        }, null, 2), 'utf-8');
        const seen = [];
        const handle = (0, ServiceRegistryLoader_1.watchServiceRegistry)(file, (next) => {
            const desired = next.registry.services.backend.desired.state;
            seen.push(desired);
        });
        fs_1.default.writeFileSync(file, JSON.stringify({
            schemaVersion: 'service-registry.v1',
            services: {
                backend: { type: 'api', runtime: 'node', desired: 'stopped' },
            },
        }, null, 2), 'utf-8');
        const deadline = Date.now() + 2500;
        while (!seen.includes('stopped') && Date.now() < deadline) {
            // fs.watch can be delayed depending on host FS events scheduling.
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        handle.close();
        expect(seen).toContain('stopped');
    });
});
