/**
 * Block Metadata Registry
 * 
 * Provides human-readable titles, descriptions, and visual metadata for all block types.
 * This replaces placeholder text like "title" or "block.start.desc" with meaningful content.
 */

export interface BlockMetadata {
    type: string;
    title: string;
    description: string;
    category: 'Control Flow' | 'Setup & Filters' | 'HTF Logic' | 'LTF Gating' | 'Trade Building';
    icon?: string; // emoji or icon identifier
    color?: string; // hex color for category
    requiresInputs?: string[]; // Strategy input keys required by this block
    outputDescription?: string; // What this block produces/outputs

    // Harness & Engine Metadata
    executionMode?: 'PER_HTF_BAR' | 'PER_LTF_BAR' | 'ON_ENTRY' | 'PER_SYMBOL' | 'LOGIC_GATE' | 'EXIT';
    primarySignal?: string; // The output key that denotes success/trigger
    requiredDependencies?: { key: string; type: string; source: 'vars' | 'inputs' | 'context' }[];
    timeframeAffinity?: 'HTF' | 'LTF' | 'ANY';

    // Typed Ports (Context Contracts)
    provides_types?: string[]; // Types of artifacts this block produces
    requires_types?: string[]; // Types of artifacts this block needs from upstream
    type_bindings?: Record<string, string>; // Maps type names to concrete ref strings (e.g. WaveContext -> 'vars.wave')
    outputs?: Record<string, { type?: string; label?: string; enum?: string[] }>;
    bottleneckThreshold?: number; // Pass-rate threshold (0-1) that marks this block as a bottleneck
    passRateMin?: number;
    passRateMax?: number;
}

import { contractService } from '../services/ContractService';

/**
 * Get metadata for a specific block type
 */
export function getBlockMetadata(type: string): BlockMetadata | undefined {
    return contractService.getBlockMetadata(type);
}

/**
 * Get all blocks in a specific category
 */
export function getBlocksByCategory(category: BlockMetadata['category']): BlockMetadata[] {
    return Object.values(contractService.getAllBlockMetadata()).filter(block => block.category === category);
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
    const categories = new Set(Object.values(contractService.getAllBlockMetadata()).map(b => b.category));
    return Array.from(categories);
}

/**
 * Category colors for visual differentiation
 */
export const categoryColors: Record<string, string> = {
    'Control Flow': '#4CAF50',
    'Setup & Filters': '#2196F3',
    'HTF Logic': '#FF9800',
    'LTF Gating': '#9C27B0',
    'Trade Building': '#F44336',
};
