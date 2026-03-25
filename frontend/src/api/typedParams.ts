/**
 * API Client for Typed Block Parameters
 */

import { BUILDER_API_BASE } from './config';

const API_BASE = BUILDER_API_BASE;

export interface BlockTypeDef {
    id: string;
    display_name: string;
    description: string;
    category: string;
    icon: string;
    timeframe_policy: string;
    version: number;
    is_enabled: number;
    execution_mode: string;
}

export interface BlockParamDef {
    id: string;
    block_type_id: string;
    key: string;
    value_type: string;
    ui_control: string;
    label: string;
    help_text: string | null;
    unit: string | null;
    min: number | null;
    max: number | null;
    step: number | null;
    enum_options_json: string | null;
    default_binding_type: string;
    default_value_json: string | null;
    is_required: number;
    allow_binding: number;
    display_order: number;
}

export interface BlockParamValue {
    id: string;
    strategy_block_id: string;
    param_def_id: string;
    binding_type: 'const' | 'input_ref';
    const_value_json: string | null;
    input_key: string | null;
}

export interface ResolvedBlockParams {
    blockId: string;
    blockType: string;
    params: Record<string, unknown>;
    paramDefs: BlockParamDef[];
    paramValues: BlockParamValue[];
}

/**
 * Get all block type definitions
 */
export async function getBlockTypes(): Promise<BlockTypeDef[]> {
    const res = await fetch(`${API_BASE}/block-types`);
    if (!res.ok) throw new Error('Failed to load block types');
    return res.json();
}

/**
 * Get parameter definitions for a block type
 */
export async function getBlockParamDefs(blockTypeId: string): Promise<BlockParamDef[]> {
    const res = await fetch(`${API_BASE}/block-types/${blockTypeId}/params`);
    if (!res.ok) throw new Error(`Failed to load params for ${blockTypeId}`);
    return res.json();
}

/**
 * Get parameter values for a block
 */
export async function getBlockParamValues(blockId: string): Promise<BlockParamValue[]> {
    const res = await fetch(`${API_BASE}/blocks/${blockId}/params`);
    if (!res.ok) throw new Error(`Failed to load param values for block ${blockId}`);
    return res.json();
}

/**
 * Get resolved parameters for a block (with input references resolved)
 */
export async function getResolvedBlockParams(
    strategyId: string,
    blockId: string
): Promise<ResolvedBlockParams> {
    const res = await fetch(`${API_BASE}/strategies/${strategyId}/blocks/${blockId}/resolved-params`);
    if (!res.ok) throw new Error(`Failed to resolve params for block ${blockId}`);
    return res.json();
}

/**
 * Set a block parameter value
 */
export async function setBlockParamValue(
    blockId: string,
    paramDefId: string,
    data: {
        bindingType: 'const' | 'input_ref';
        constValue?: unknown;
        inputKey?: string;
    }
): Promise<void> {
    const res = await fetch(`${API_BASE}/blocks/${blockId}/params/${paramDefId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to set param value`);
}

/**
 * Set multiple parameter values for a block
 */
export async function setBlockParams(
    blockId: string,
    params: Array<{
        paramDefId: string;
        bindingType: 'const' | 'input_ref';
        constValue?: unknown;
        inputKey?: string;
    }>
): Promise<void> {
    const res = await fetch(`${API_BASE}/blocks/${blockId}/params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params })
    });
    if (!res.ok) throw new Error(`Failed to set params`);
}

/**
 * Delete a block parameter value
 */
export async function deleteBlockParamValue(
    blockId: string,
    paramDefId: string
): Promise<void> {
    const res = await fetch(`${API_BASE}/blocks/${blockId}/params/${paramDefId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to delete param value`);
}
