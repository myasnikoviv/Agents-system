import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ServiceRegistryDefinition, validateServiceRegistryDefinition } from './ServiceRegistryContract';

export interface ServiceRegistryLoadResult {
  sourcePath: string;
  loadedAt: string;
  registry: ServiceRegistryDefinition;
}

export interface ServiceRegistryWatchHandle {
  close: () => void;
}

function parseRegistryPayload(input: string, sourcePath: string): unknown {
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') {
    return yaml.load(input);
  }
  return JSON.parse(input);
}

export function loadServiceRegistry(sourcePath: string): ServiceRegistryLoadResult {
  const abs = path.resolve(sourcePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`service_registry_not_found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, 'utf-8');
  const parsed = parseRegistryPayload(raw, abs);
  const registry = validateServiceRegistryDefinition(parsed);
  return {
    sourcePath: abs,
    loadedAt: new Date().toISOString(),
    registry,
  };
}

export function watchServiceRegistry(
  sourcePath: string,
  onReload: (result: ServiceRegistryLoadResult) => void,
  onError?: (error: Error) => void,
): ServiceRegistryWatchHandle {
  const abs = path.resolve(sourcePath);
  const listener = () => {
    try {
      const next = loadServiceRegistry(abs);
      onReload(next);
    } catch (error: any) {
      if (onError) onError(error instanceof Error ? error : new Error(String(error?.message || error)));
    }
  };
  fs.watchFile(abs, { interval: 100, persistent: false }, (curr, prev) => {
    if (curr.mtimeMs === prev.mtimeMs) return;
    listener();
  });

  return {
    close: () => fs.unwatchFile(abs),
  };
}
