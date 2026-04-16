"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LocalProcessAdapter_1 = require("../control-plane/LocalProcessAdapter");
const DockerAdapter_1 = require("../control-plane/DockerAdapter");
const ServiceExecutionAdapter_1 = require("../control-plane/adapters/ServiceExecutionAdapter");
describe('Adapter abstraction layer (AGSYS-2709)', () => {
    it('registers adapters and resolves them by id', () => {
        const registry = new ServiceExecutionAdapter_1.ServiceExecutionAdapterRegistry();
        const local = new LocalProcessAdapter_1.LocalProcessAdapter();
        const docker = new DockerAdapter_1.DockerAdapter(async () => ({ stdout: '', stderr: '', code: 0 }));
        registry.register(local);
        registry.register(docker);
        expect(registry.listAdapterIds()).toEqual(['docker', 'local-process']);
        expect(registry.get('local-process').adapterId).toBe('local-process');
        expect(registry.get('docker').adapterId).toBe('docker');
    });
    it('throws on unknown adapter', () => {
        const registry = new ServiceExecutionAdapter_1.ServiceExecutionAdapterRegistry();
        expect(() => registry.get('cloud')).toThrow('service_execution_adapter_not_found:cloud');
    });
});
