import { LocalProcessAdapter } from '../control-api/LocalProcessAdapter';
import { DockerAdapter } from '../control-api/DockerAdapter';
import { ServiceExecutionAdapterRegistry } from '../control-api/adapters/ServiceExecutionAdapter';

describe('Adapter abstraction layer (AGSYS-2709)', () => {
  it('registers adapters and resolves them by id', () => {
    const registry = new ServiceExecutionAdapterRegistry();
    const local = new LocalProcessAdapter();
    const docker = new DockerAdapter(async () => ({ stdout: '', stderr: '', code: 0 }));

    registry.register(local);
    registry.register(docker);

    expect(registry.listAdapterIds()).toEqual(['docker', 'local-process']);
    expect(registry.get('local-process').adapterId).toBe('local-process');
    expect(registry.get('docker').adapterId).toBe('docker');
  });

  it('throws on unknown adapter', () => {
    const registry = new ServiceExecutionAdapterRegistry();
    expect(() => registry.get('cloud')).toThrow('service_execution_adapter_not_found:cloud');
  });
});
