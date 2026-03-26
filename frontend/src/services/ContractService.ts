import axios from 'axios';
import type { BlockMetadata } from '../components/blockMetadata';
import type { ContextType } from '../types/context_types';
import { API_BASE } from '../api/config';

interface ContractRegistry {
    blocks: Record<string, BlockMetadata>;
    types: Record<string, ContextType>;
    version: string | null;
    isLoaded: boolean;
}

interface BackendBlockTypeDef {
    id: string;
    display_name: string;
    description: string;
    category: string;
    icon?: string;
    color?: string;
    execution_mode?: string;
    primary_signal?: string;
    timeframe_affinity?: string;
    bottleneck_threshold?: number;
    pass_rate_min?: number;
    pass_rate_max?: number;
    requires_types_json?: string;
    provides_types_json?: string;
    type_bindings_json?: string;
    required_inputs_json?: string;
    outputs_json?: string;
}

interface BackendContextTypeTypeDef {
    id: string;
    display_name: string;
    description: string;
    color?: string;
    schema_json?: string;
}

class ContractService {
    private registry: ContractRegistry = {
        blocks: {},
        types: {},
        version: null,
        isLoaded: false
    };

    private loadPromise: Promise<void> | null = null;

    private isDebugEnabled(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            return (
                window.localStorage.getItem('agsys_debug_contracts') === '1' ||
                window.localStorage.getItem('tb_debug_contracts') === '1'
            );
        } catch {
            return false;
        }
    }

    async ensureLoaded(): Promise<void> {
        if (this.registry.isLoaded) return;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = this.fetchContracts().then(() => {
            this.registry.isLoaded = true;
            this.loadPromise = null;
        });

        return this.loadPromise;
    }

    private async fetchContracts(): Promise<void> {
        try {
            const [blocksRes, typesRes] = await Promise.all([
                axios.get(`${API_BASE}/contracts/block_catalog`),
                axios.get(`${API_BASE}/contracts/context_types`)
            ]);

            const blockCatalog = blocksRes.data.catalog;
            const contextTypes = typesRes.data.types;
            this.registry.version = blocksRes.data.version;

            // Map Backend BlockTypeDef to Frontend BlockMetadata
            const mappedBlocks: Record<string, BlockMetadata> = {};
            blockCatalog.forEach((b: BackendBlockTypeDef) => {
                let outputs = {};
                try { outputs = b.outputs_json ? JSON.parse(b.outputs_json) : {}; } catch { outputs = {}; }
                mappedBlocks[b.id] = {
                    type: b.id,
                    title: b.display_name,
                    description: b.description || '',
                    category: b.category as BlockMetadata['category'],
                    icon: b.icon,
                    color: b.color || this.getCategoryColor(b.category),
                    executionMode: b.execution_mode as BlockMetadata['executionMode'],
                    primarySignal: b.primary_signal,
                    timeframeAffinity: b.timeframe_affinity as BlockMetadata['timeframeAffinity'],
                    bottleneckThreshold: typeof b.bottleneck_threshold === 'number' ? b.bottleneck_threshold : undefined,
                    passRateMin: typeof b.pass_rate_min === 'number' ? b.pass_rate_min : undefined,
                    passRateMax: typeof b.pass_rate_max === 'number' ? b.pass_rate_max : undefined,
                    requires_types: b.requires_types_json ? JSON.parse(b.requires_types_json) : [],
                    provides_types: b.provides_types_json ? JSON.parse(b.provides_types_json) : [],
                    type_bindings: b.type_bindings_json ? JSON.parse(b.type_bindings_json) : {},
                    requiresInputs: b.required_inputs_json ? JSON.parse(b.required_inputs_json).map((i: { key: string }) => i.key) : [],
                    outputs
                };
            });

            // Map Backend ContextType to Frontend ContextType
            const mappedTypes: Record<string, ContextType> = {};
            contextTypes.forEach((t: BackendContextTypeTypeDef) => {
                mappedTypes[t.id] = {
                    id: t.id,
                    display_name: t.display_name,
                    description: t.description || '',
                    color: t.color || '#555',
                    schema: t.schema_json ? JSON.parse(t.schema_json) : undefined
                };
            });

            this.registry.blocks = mappedBlocks;
            this.registry.types = mappedTypes;

            if (this.isDebugEnabled()) {
                console.log(`[ContractService] Loaded version ${this.registry.version} with ${Object.keys(mappedBlocks).length} blocks and ${Object.keys(mappedTypes).length} types.`);
            }

        } catch (error) {
            console.error('[ContractService] Failed to fetch contracts', error);
            throw error;
        }
    }

    getBlockMetadata(type: string): BlockMetadata | undefined {
        return this.registry.blocks[type];
    }

    getAllBlockMetadata(): Record<string, BlockMetadata> {
        return this.registry.blocks;
    }

    getContextType(id: string): ContextType | undefined {
        return this.registry.types[id];
    }

    getAllContextTypes(): Record<string, ContextType> {
        return this.registry.types;
    }

    getContractVersion(): string | null {
        return this.registry.version;
    }

    /**
     * Rule R1/R2/R3: Resolve concrete paths for a block's contract
     */
    resolveBlockContract(blockType: string, primarySignalOverride?: string) {
        const meta = this.getBlockMetadata(blockType);
        if (!meta) return null;

        const inputs: {
            typeId: string;
            path: string;
            label: string;
            fields: { path: string, label: string, description: string }[]
        }[] = [];

        const outputs: {
            typeId: string;
            path: string;
            label: string;
            fields: { path: string, label: string, description: string, isPrimary: boolean }[];
            isPrimary: boolean
        }[] = [];

        const primarySignal = primarySignalOverride || meta.primarySignal;

        // Resolve Inputs (requires_types)
        if (meta.requires_types) {
            meta.requires_types.forEach(typeId => {
                const type = this.getContextType(typeId);
                const binding = meta.type_bindings?.[typeId];

                if (!binding && this.isDebugEnabled()) {
                    console.warn(`[ContractService] Block ${blockType} missing binding for required type ${typeId}`);
                }

                const path = binding || `[${typeId}]`;
                inputs.push({
                    typeId,
                    path: path,
                    label: type?.display_name || typeId,
                    fields: type?.schema ? Object.entries(type.schema).map(([fKey, fMeta]) => ({
                        path: `${path}.${fKey}`,
                        label: fMeta.display_name || fKey,
                        description: fMeta.description || ''
                    })) : []
                });
            });
        }

        // Resolve Outputs (provides_types)
        if (meta.provides_types) {
            meta.provides_types.forEach(typeId => {
                const type = this.getContextType(typeId);
                const binding = meta.type_bindings?.[typeId];
                const isPrimary = typeId === primarySignal;

                if (!binding && this.isDebugEnabled()) {
                    console.warn(`[ContractService] Block ${blockType} missing binding for provided type ${typeId}`);
                }

                const path = binding || `[${typeId}]`;
                outputs.push({
                    typeId,
                    path: path,
                    label: type?.display_name || typeId,
                    fields: type?.schema ? Object.entries(type.schema).map(([fKey, fMeta]) => {
                        const fieldPath = `${path}.${fKey}`;
                        const fieldIsPrimary = isPrimary && fKey === 'ok'; // Standard primary field
                        return {
                            path: fieldPath,
                            label: fMeta.display_name || fKey,
                            description: fMeta.description || '',
                            isPrimary: fieldIsPrimary
                        };
                    }) : [],
                    isPrimary
                });
            });
        }

        return { inputs, outputs };
    }

    private getCategoryColor(category: string): string {
        switch (category) {
            case 'Control Flow': return '#4CAF50';
            case 'Setup & Filters': return '#2196F3';
            case 'HTF Logic': return '#FF9800';
            case 'LTF Gating': return '#9C27B0';
            case 'Trade Building': return '#F44336';
            default: return '#607D8B';
        }
    }
}

export const contractService = new ContractService();
