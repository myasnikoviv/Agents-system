export * from './RuntimePathResolver';
export * from './ExecutionTypes';
export * from './AuditIntegrity';
export * from './ProjectModels';
export * from './Infrastructure';
export * from './EnvironmentModels';
export * from './GitExecutionGuard';
export * from './llm/LLMWrapper';
export * from './CockpitExecutorConfig';

export interface LLMTrace {
  requestId: string;
  runId: string;
  model: string;
  provider: 'codex-cli' | 'openhands' | 'claude-cli' | string;
  prompt: string;
  response: string;
  tokensInput: number;
  tokensOutput: number;
  durationMs: number;
  source: 'agent' | 'guard' | 'retry' | 'system';
  timestamp: number;
}

export type AbacRole = 'admin' | 'operator' | 'viewer' | 'auditor';

export interface StoredObjectRecord {
  id: string;
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredObjectPayload extends StoredObjectRecord {
  data: string; // base64
}
