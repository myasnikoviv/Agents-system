export type CockpitExecutorBackend = 'claude-cli' | 'codex-cli' | 'openhands-sdk';

export interface CockpitRuntimeCapabilities {
  requiresLocalAuth: boolean;
  supportsExecutorSelection: boolean;
  implicitCodexApiKey?: string;
  effectiveMode: 'cli' | 'direct';
  openhandsServerAlive?: boolean;
}

export interface CockpitExecutorConfig {
  backend: CockpitExecutorBackend;
  projectRoot: string;
  claude: {
    bin: string;
    model: string;
  };
  codex: {
    bin: string;
    model: string;
    sandbox: 'read-only' | 'workspace-write' | 'danger-full-access';
  };
  openhands: {
    serverUrl: string;
    model: string;
    apiKeys: {
      openai?: string;
      anthropic?: string;
      google?: string;
    };
  };
}

export function loadConfig(projectRoot: string): CockpitExecutorConfig {
  const absProjectRoot = projectRoot;
  const resolvedCodexBin = process.env.CODEX_CLI_BIN || 'codex';
  
  const defaults: CockpitExecutorConfig = {
    backend: 'claude-cli',
    projectRoot: absProjectRoot,
    claude: {
      bin: process.env.CLAUDE_CLI_BIN || 'claude',
      model: process.env.CLAUDE_CODE_MODEL || 'auto',
    },
    codex: {
      bin: resolvedCodexBin,
      model: process.env.CODEX_MODEL || 'auto',
      sandbox: 'workspace-write',
    },
    openhands: {
      serverUrl: process.env.OPENHANDS_SERVER_URL || 'http://localhost:8000',
      model: process.env.OPENHANDS_MODEL || 'anthropic/claude-sonnet-4-6',
      apiKeys: {
        openai: process.env.OPENAI_API_KEY || '',
        anthropic: process.env.ANTHROPIC_API_KEY || '',
        google: process.env.GOOGLE_API_KEY || '',
      },
    },
  };

  // Hard-remediation: file-based cockpit_config.json is removed.
  // Runtime configuration is sourced from env + secrets-backed API paths.
  return defaults;
}

export function saveConfig(config: CockpitExecutorConfig) {
  // Hard-remediation: local file persistence is intentionally removed.
  // Keep function as no-op for compatibility with existing call sites.
  void config;
}

export function getCockpitExecutorConfig(): CockpitExecutorConfig {
  return loadConfig(process.cwd());
}

export function updateCockpitExecutorConfig(config: Partial<CockpitExecutorConfig>): CockpitExecutorConfig {
  const current = getCockpitExecutorConfig();
  const updated = {
    ...current,
    ...config,
    claude: { ...current.claude, ...(config.claude || {}) },
    codex: { ...current.codex, ...(config.codex || {}) },
    openhands: {
      ...current.openhands,
      ...(config.openhands || {}),
      apiKeys: {
        ...current.openhands.apiKeys,
        ...(config.openhands?.apiKeys || {}),
      },
    },
  };
  saveConfig(updated);
  return updated;
}

export function resolveRuntimeCapabilities(config?: CockpitExecutorConfig): CockpitRuntimeCapabilities {
  let implicitCodexApiKey = undefined;
  if (process.env.OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY;
    implicitCodexApiKey = key.length > 10 ? `${key.slice(0, 8)}...${key.slice(-4)}` : '***';
  }

  return {
    requiresLocalAuth: true,
    supportsExecutorSelection: true,
    implicitCodexApiKey,
    effectiveMode: 'cli',
    openhandsServerAlive: false,
  };
}
