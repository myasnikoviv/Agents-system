import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

export type ServiceKind = 'api' | 'worker' | 'infra';
export type ServiceRuntime = 'node' | 'docker' | 'external';
export type DesiredServiceState = 'running' | 'stopped';
export type RestartPolicyMode = 'never' | 'on-failure' | 'always';

export interface ServiceRestartPolicy {
  mode?: RestartPolicyMode;
  maxRetries?: number;
  backoffMs?: number;
  [key: string]: unknown;
}

export interface DesiredServiceModel {
  state: DesiredServiceState;
  restartPolicy?: ServiceRestartPolicy;
  [key: string]: unknown;
}

export interface ServiceDescriptor {
  type: ServiceKind;
  runtime: ServiceRuntime;
  desired: DesiredServiceModel;
  entrypoint?: string;
  args?: string[];
  env?: Record<string, string>;
  health?: {
    protocol?: 'http' | 'heartbeat' | 'process' | 'none';
    endpoint?: string;
    intervalMs?: number;
    timeoutMs?: number;
    expectedStatus?: number;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ServiceRegistryDefinition {
  schemaVersion: 'service-registry.v1';
  services: Record<string, ServiceDescriptor>;
}

type RawServiceDescriptor = Omit<ServiceDescriptor, 'desired'> & {
  desired: DesiredServiceState | DesiredServiceModel;
  restartPolicy?: ServiceRestartPolicy;
};

type RawServiceRegistryDefinition = {
  schemaVersion: 'service-registry.v1';
  services: Record<string, RawServiceDescriptor>;
};

const schemaPath = path.resolve(process.cwd(), 'docs/runtime/schemas/service-registry.v1.schema.json');
const rawSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateRegistry = ajv.compile(rawSchema);

export function validateServiceRegistryDefinition(input: unknown): ServiceRegistryDefinition {
  const ok = validateRegistry(input);
  if (!ok) {
    const details = (validateRegistry.errors || [])
      .map((e) => `${e.instancePath || '/'} ${e.message || 'invalid'}`)
      .join('; ');
    throw new Error(`service_registry_schema_validation_failed: ${details}`);
  }
  return normalizeServiceRegistryDefinition(input as RawServiceRegistryDefinition);
}

function normalizeServiceRegistryDefinition(input: RawServiceRegistryDefinition): ServiceRegistryDefinition {
  const services: Record<string, ServiceDescriptor> = {};
  for (const [serviceId, descriptor] of Object.entries(input.services || {})) {
    const desired =
      typeof descriptor.desired === 'string'
        ? {
            state: descriptor.desired,
            ...(descriptor.restartPolicy ? { restartPolicy: { ...descriptor.restartPolicy } } : {}),
          }
        : {
            ...descriptor.desired,
            ...(descriptor.desired.restartPolicy ? { restartPolicy: { ...descriptor.desired.restartPolicy } } : {}),
          };

    const next: ServiceDescriptor = {
      ...descriptor,
      type: descriptor.type as ServiceKind,
      runtime: descriptor.runtime as ServiceRuntime,
      desired,
    };
    delete (next as any).restartPolicy;
    services[serviceId] = next;
  }
  return {
    schemaVersion: input.schemaVersion,
    services,
  };
}
