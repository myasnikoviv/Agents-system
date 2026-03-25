import type { StrategyWithDetails } from '../types/strategy';
import { getBlockMetadata, type BlockMetadata } from '../components/blockMetadata';
import { contractService } from '../services/ContractService';

/**
 * Result of ref set computation
 */
export interface RefSet {
    all: string[];          // All available ref keys (e.g. "BLOCK_1.wave_found")
    outputs: string[];      // Just output refs
    inputs: string[];       // Strategy inputs
    vars: string[];         // User-defined variables
    availableTypes: string[]; // Set of ContextType IDs available
}

/**
 * Validation error for a specific edge
 */
export interface EdgeValidationError {
    edgeId: string;
    message: string;
    level: 'error' | 'warning' | 'ok';
    availableTypes?: string[];
    requiredTypes?: string[];
    missingTypes?: string[];
}

/**
 * Diagnostics for a specific edge
 */
export interface EdgeDiagnostics {
    edgeId: string;
    status: 'ok' | 'warn' | 'error';
    availableTypes: string[];
    requiredTypes: string[];
    missingTypes: string[];
    message: string;
}

/**
 * Compute the set of available references for a given block or edge in the strategy graph.
 * Performs a traversal starting from entry points to find reachable outputs/types.
 */
export function computeAvailableRefs(
    strategy: StrategyWithDetails,
    targetBlockId?: string,
    edgeId?: string
): RefSet {
    const refs: RefSet = {
        all: [],
        outputs: [],
        inputs: (strategy.inputs || []).map((i: { key: string }) => i.key),
        vars: [],
        availableTypes: []
    };

    // 1. Inputs are always available
    refs.all.push(...refs.inputs.map(i => `inputs.${i}`));

    // 2. Compute reachable outputs
    // If targetBlockId is provided, we look at everything upstream of that block.
    // If edgeId is provided, we look at everything upstream of the edge's SOURCE block.
    let startBlockId = targetBlockId;
    if (edgeId) {
        const edge = strategy.edges.find(e => e.id === edgeId);
        if (edge) startBlockId = edge.from_block_id;
    }

    if (!startBlockId) return refs;

    const upstreamBlockIds = findUpstreamBlocks(strategy, startBlockId);

    // Include the start block itself if we are looking at an edge coming OUT of it
    if (edgeId) {
        upstreamBlockIds.add(startBlockId);
    }

    for (const blockId of upstreamBlockIds) {
        const block = strategy.blocks.find(b => b.id === blockId);
        if (!block) continue;

        const meta = getBlockMetadata(block.type);
        if (!meta) continue;

        // Add primary signal
        if (meta.primarySignal) {
            const key = `${block.id}.${meta.primarySignal}`;
            refs.outputs.push(key);
            refs.all.push(key);
        }
        // Add all known outputs for richer UI/editor support
        const outputs = (meta as BlockMetadata).outputs;
        if (outputs) {
            Object.keys(outputs).forEach(outputKey => {
                const key = `${block.id}.${outputKey}`;
                if (!refs.outputs.includes(key)) refs.outputs.push(key);
                if (!refs.all.includes(key)) refs.all.push(key);
            });
        }

        // 3. Collect Provided Types and Concrete Paths
        if (meta.provides_types) {
            for (const typeId of meta.provides_types) {
                // Track types for high-level visualization (Flow Chips)
                if (!refs.availableTypes.includes(typeId)) {
                    refs.availableTypes.push(typeId);
                }

                // Add concrete paths based on bindings for condition suggestions
                const binding = meta.type_bindings?.[typeId];
                if (binding) {
                    refs.all.push(binding);

                    // If we have a schema for this type, add all its fields too
                    const type = contractService.getContextType(typeId);
                    if (type?.schema) {
                        Object.keys(type.schema).forEach(field => {
                            refs.all.push(`${binding}.${field}`);
                        });
                    }
                }
            }
        }
    }

    return refs;
}

/**
 * Find all blocks that are upstream of the target block
 */
function findUpstreamBlocks(strategy: StrategyWithDetails, targetBlockId: string): Set<string> {
    const upstream = new Set<string>();
    const queue = [targetBlockId];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        // Find edges ENTERING this block
        const incomingEdges = strategy.edges.filter(e => e.to_block_id === currentId);
        for (const edge of incomingEdges) {
            upstream.add(edge.from_block_id);
            queue.push(edge.from_block_id);
        }
    }

    return upstream;
}

/**
 * Validate all edges in a strategy
 */
export function validateStrategyEdges(strategy: StrategyWithDetails): EdgeValidationError[] {
    const errors: EdgeValidationError[] = [];

    for (const edge of strategy.edges) {
        if (!edge.condition_json) continue;

        let condition: unknown;
        try {
            condition = typeof edge.condition_json === 'string' ? JSON.parse(edge.condition_json) : edge.condition_json;
        } catch {
            errors.push({ edgeId: edge.id, message: 'Invalid condition JSON', level: 'error' });
            continue;
        }

        if (!condition || condition === 'true') continue;
        const condObj = condition as Record<string, unknown>;
        if (condObj.op === 'always') continue;

        const refs = computeAvailableRefs(strategy, edge.from_block_id);

        // Check if field/left ref exists
        const field = (condObj.field || condObj.left) as string | undefined;
        if (field) {
            // Check if it's a relative ref (just 'wave_found') or absolute ('BLOCK_1.wave_found')
            const isAbsolute = field.includes('.');

            if (isAbsolute) {
                if (!refs.all.includes(field)) {
                    errors.push({
                        edgeId: edge.id,
                        message: `Reference "${field}" not found in upstream scope.`,
                        level: 'warning'
                    });
                }
            } else {
                // If relative, check if it exists in the IMMEDIATE source block
                const sourceBlock = strategy.blocks.find(b => b.id === edge.from_block_id);
                const sourceMeta = sourceBlock ? getBlockMetadata(sourceBlock.type) : null;

                if (sourceMeta && sourceMeta.primarySignal !== field) {
                    errors.push({
                        edgeId: edge.id,
                        message: `Output "${field}" not found on block "${sourceBlock?.title || sourceBlock?.type}".`,
                        level: 'warning'
                    });
                }
            }
        }
    }

    return errors;
}
/**
 * Validate that each block has its required context types satisfied by upstream blocks.
 */
export function validateBlockContracts(strategy: StrategyWithDetails, strict: boolean = true): EdgeValidationError[] {
    const errors: EdgeValidationError[] = [];

    for (const block of strategy.blocks) {
        const meta = getBlockMetadata(block.type);
        if (!meta || !meta.requires_types || meta.requires_types.length === 0) continue;

        const refs = computeAvailableRefs(strategy, block.id);

        for (const reqType of meta.requires_types) {
            if (!refs.availableTypes.includes(reqType)) {
                errors.push({
                    edgeId: 'BLOCK_' + block.id, // Overloading edgeId for block errors
                    message: `Block "${block.title || block.type}" requires "${reqType}" but it is not provided by any upstream path.`,
                    level: strict ? 'error' : 'warning'
                });
            }
        }
    }

    return errors;
}

/**
 * Compute diagnostics for a single edge
 */
export function computeEdgeDiagnostics(strategy: StrategyWithDetails, edgeId: string, strict: boolean = true): EdgeDiagnostics {
    const edge = strategy.edges.find(e => e.id === edgeId);
    if (!edge) {
        return { edgeId, status: 'error', availableTypes: [], requiredTypes: [], missingTypes: [], message: 'Edge not found' };
    }

    const sourceRefs = computeAvailableRefs(strategy, undefined, edgeId);
    const targetBlock = strategy.blocks.find(b => b.id === edge.to_block_id);
    const targetMeta = targetBlock ? getBlockMetadata(targetBlock.type) : null;

    const requiredTypes = targetMeta?.requires_types || [];
    const availableTypes = sourceRefs.availableTypes;
    const missingTypes = requiredTypes.filter(t => !availableTypes.includes(t));

    let status: 'ok' | 'warn' | 'error' = 'ok';
    let message = 'Connection OK';

    if (missingTypes.length > 0) {
        status = strict ? 'error' : 'warn';
        message = `Missing required context: ${missingTypes.join(', ')}`;
    }

    // TODO: Add path-conditional logic (Lenient vs Strict paths)
    // For now we use the combined upstream available types.

    return {
        edgeId,
        status,
        availableTypes,
        requiredTypes,
        missingTypes,
        message
    };
}

/**
 * Combined validation for strategies
 */
export function validateStrategy(strategy: StrategyWithDetails, strict: boolean = true): EdgeValidationError[] {
    const edgeErrors = validateStrategyEdges(strategy);
    const contractErrors = validateBlockContracts(strategy, strict);

    // Add per-edge contract diagnostics as errors
    const contractDiagnostics = strategy.edges.map(e => {
        const diag = computeEdgeDiagnostics(strategy, e.id, strict);
        if (diag.status !== 'ok') {
            return {
                edgeId: e.id,
                message: diag.message,
                level: diag.status as 'error' | 'warning',
                availableTypes: diag.availableTypes,
                requiredTypes: diag.requiredTypes,
                missingTypes: diag.missingTypes
            };
        }
        return null;
    }).filter(e => e !== null) as EdgeValidationError[];

    return [...edgeErrors, ...contractErrors, ...contractDiagnostics];
}

/**
 * Get diagnostics for ALL edges in the strategy
 */
export function getAllEdgeDiagnostics(strategy: StrategyWithDetails, strict: boolean = true): EdgeDiagnostics[] {
    return strategy.edges.map(e => computeEdgeDiagnostics(strategy, e.id, strict));
}
