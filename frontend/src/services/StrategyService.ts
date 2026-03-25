
import axios from 'axios';
import { API_BASE } from '../api/config';

const API_Base = API_BASE;

export interface StrategyFile {
    filename: string;
    meta?: {
        id: string;
        name: string;
        version: string;
        description?: string;
    };
    dslVersion?: string;
    content?: string; // Only when reading single file
}

export interface CreateStrategyRequest {
    name: string;
    id: string;
    version?: string;
    description?: string;
    initialTimeframe?: string;
    cloneFrom?: string;
}

export interface CreateStrategyResponse {
    filename: string;
}

export interface DuplicateStrategyResponse {
    newFilename: string;
}

export interface BuilderBacktestStartResponse {
    success: boolean;
    jobId: string;
}

export interface BuilderBacktestStatusResponse {
    success: boolean;
    jobId: string;
    status: 'queued' | 'running' | 'done' | 'error';
    error?: string;
    elapsedMs?: number;
    progress?: {
        telemetry?: Record<string, unknown>;
    } | null;
    result?: unknown;
}

interface StrategyResponseItem {
    id: string;
    name: string;
    description: string;
}

export const StrategyService = {
    listStrategies: async (): Promise<StrategyFile[]> => {
        // [Migrated to Builder Strategies]
        try {
            const res = await axios.get(`${API_Base}/builder/strategies`);
            // Adapt Builder Strategy to StrategyFile interface
            return res.data.map((s: StrategyResponseItem) => ({
                filename: s.id, // Use ID as filename
                meta: {
                    id: s.id,
                    name: s.name,
                    version: '1.0.0', // Default
                    description: s.description
                },
                dslVersion: '0.1'
            }));
        } catch {
            return [];
        }
    },

    getStrategy: async (id: string): Promise<StrategyFile> => {
        const res = await axios.get(`${API_Base}/builder/strategies/${id}`);
        const strategy = res.data || {};
        return {
            filename: strategy.id || id,
            meta: {
                id: strategy.id || id,
                name: strategy.name || 'Block Strategy',
                version: strategy?.meta?.version || '1.0.0',
                description: strategy.description
            },
            dslVersion: '2.0',
            content: ''
        };
    },

    createStrategy: async (request: CreateStrategyRequest): Promise<CreateStrategyResponse> => {
        const res = await axios.post(`${API_Base}/builder/strategies`, {
            name: request.name,
            description: request.description || '',
            meta: {
                requestedId: request.id,
                version: request.version || '1.0.0',
                initialTimeframe: request.initialTimeframe,
                cloneFrom: request.cloneFrom
            }
        });
        return { filename: res.data?.id || request.id };
    },

    saveStrategy(_id: string, _content: string): Promise<void> {
        // Builder API is source-of-truth; direct text save is intentionally unsupported.
        console.debug('Direct text save is unsupported', _id, _content.length);
        return Promise.resolve();
    },

    duplicateStrategy: async (id: string): Promise<DuplicateStrategyResponse> => {
        const res = await axios.post(`${API_Base}/builder/strategies/${id}/clone`, {});
        return { newFilename: res.data?.id || '' };
    },

    deleteStrategy: async (id: string): Promise<void> => {
        await axios.delete(`${API_Base}/builder/strategies/${id}`);
    },

    runDraftBacktest: async (symbol: string, days: number, strategyYamlText: string) => {
        const res = await axios.post(`${API_Base}/backtest`, { symbol, days, strategyYamlText });
        return res.data;
    },

    runBuilderBacktest: async (strategyId: string, symbol: string, days: number, presetId?: string) => {
        const res = await axios.post(`${API_Base}/builder/strategies/${strategyId}/backtest`, {
            symbol,
            days,
            presetId
        });
        return res.data;
    },

    startBuilderBacktest: async (strategyId: string, symbol: string, days: number, presetId?: string): Promise<BuilderBacktestStartResponse> => {
        const res = await axios.post(`${API_Base}/builder/strategies/${strategyId}/backtest/start`, {
            symbol,
            days,
            presetId
        });
        return res.data;
    },

    getBuilderBacktestStatus: async (jobId: string): Promise<BuilderBacktestStatusResponse> => {
        const res = await axios.get(`${API_Base}/builder/backtests/${jobId}/status`);
        return res.data;
    },

    getBuilderStrategyFull: async (id: string): Promise<unknown> => {
        const res = await axios.get(`${API_Base}/builder/strategies/${id}`);
        return res.data;
    },

    getStrategyInputPresets: async (strategyId: string): Promise<{ presets: unknown[], active_input_preset_id: string }> => {
        const res = await axios.get(`${API_Base}/builder/strategies/${strategyId}/input-presets`);
        return res.data;
    }
};
