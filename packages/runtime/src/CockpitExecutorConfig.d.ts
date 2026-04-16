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
export declare function loadConfig(projectRoot: string): CockpitExecutorConfig;
export declare function saveConfig(config: CockpitExecutorConfig): void;
export declare function getCockpitExecutorConfig(): CockpitExecutorConfig;
export declare function updateCockpitExecutorConfig(config: Partial<CockpitExecutorConfig>): CockpitExecutorConfig;
export declare function resolveRuntimeCapabilities(config?: CockpitExecutorConfig): CockpitRuntimeCapabilities;
