import { enumOptions, sliderConfigs } from '../components/fieldLabels';

export interface StrategyInput {
    id?: string;
    strategy_id?: string;
    key: string;
    type?: string;
    value_json?: string; // JSON string from API
    value?: unknown; // Parsed value
    constraints_json?: string | null;
    description?: string | null;
    ui_group?: string | null;
    ui_order?: number;
}

/**
 * Format a field value for display, resolving input references and applying formatting
 */
export function formatFieldValue(
    fieldKey: string,
    rawValue: unknown,
    inputs?: StrategyInput[]
): string {
    // Handle null/undefined
    if (rawValue === null || rawValue === undefined) {
        return '—';
    }

    // If value is input reference (string matching input key)
    if (isInputReference(rawValue)) {
        const input = inputs?.find(i => i.key === rawValue);
        if (input) {
            // Get actual value from either value or value_json
            const actualValue = input.value !== undefined
                ? input.value
                : (input.value_json ? JSON.parse(input.value_json) : undefined);
            if (actualValue !== undefined) {
                return formatActualValue(fieldKey, actualValue);
            }
        }
        // Fallback: show reference name with arrow
        return `→ ${rawValue}`;
    }

    // If value is a binding object (e.g. { bind: { type: 'input', key: ... } })
    if (isBindingObject(rawValue)) {
        const { type, key, value, ref } = rawValue.bind;
        if (type === 'input' && key) {
            return formatFieldValue(fieldKey, key, inputs);
        }
        if (type === 'output_ref' && ref) {
            return `🔗 ${ref}`;
        }
        if (type === 'const') {
            return formatActualValue(fieldKey, value);
        }
    }

    // If array of input references
    if (Array.isArray(rawValue) && rawValue.length > 0 && rawValue.every(isInputReference)) {
        const resolvedValues = rawValue.map(ref => {
            const input = inputs?.find(i => i.key === ref);
            if (input) {
                const actualValue = input.value !== undefined
                    ? input.value
                    : (input.value_json ? JSON.parse(input.value_json) : undefined);
                return actualValue !== undefined ? formatActualValue(fieldKey, actualValue) : `→ ${ref}`;
            }
            return `→ ${ref}`;
        });
        return resolvedValues.join(', ');
    }

    // If regular array
    if (Array.isArray(rawValue)) {
        return rawValue.map(v => formatActualValue(fieldKey, v)).join(', ');
    }

    return formatActualValue(fieldKey, rawValue as unknown);
}

/**
 * Check if value is a binding object
 */
function isBindingObject(value: unknown): value is { bind: { type: 'const' | 'input' | 'output_ref'; key?: string; value?: unknown; ref?: string } } {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (!('bind' in v) || !v.bind || typeof v.bind !== 'object') return false;
    const bind = v.bind as Record<string, unknown>;
    return 'type' in bind && typeof bind.type === 'string' && ['const', 'input', 'output_ref'].includes(bind.type);
}

/**
 * Format an actual value (not an input reference)
 */
function formatActualValue(fieldKey: string, value: unknown): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return '—';
    }

    // Boolean values
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    // Check if enum field
    const enumOpts = enumOptions[fieldKey];
    if (enumOpts) {
        const option = enumOpts.find(opt => opt.value === value);
        return option?.label || String(value);
    }

    // Check if number with units
    const sliderCfg = sliderConfigs[fieldKey];
    if (sliderCfg && typeof value === 'number') {
        const suffix = sliderCfg.suffix || '';
        // Special handling for percentages
        if (suffix === '%' && value < 1) {
            return `${(value * 100).toFixed(1)}%`;
        }
        return `${value}${suffix}`;
    }

    // Handle percentages (ratios) - heuristic based on field name
    if ((fieldKey.includes('ratio') || fieldKey.includes('pct')) && typeof value === 'number') {
        if (value < 1 && value > 0) {
            return `${(value * 100).toFixed(1)}%`;
        }
    }

    // Handle basis points
    if (fieldKey.includes('bps') && typeof value === 'number') {
        return `${value} bps`;
    }

    // Number formatting
    if (typeof value === 'number') {
        // Format large numbers with commas
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return value.toLocaleString();
        }
        // Decimal numbers
        if (value % 1 !== 0) {
            return value.toFixed(2);
        }
        return String(value);
    }

    // Handle objects/arrays that weren't caught above
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2); // Pretty print for readability? Or compact?
        } catch {
            return String(value);
        }
    }

    return String(value);
}

/**
 * Heuristic to detect if a value is an input reference
 */
function isInputReference(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    // Input references typically:
    // - End with '_input' or contain '_input_'
    // - Are lowercase with underscores
    // - Match pattern like 'test_mode', 'htf', 'ltf'
    return (
        value.includes('_input') ||
        (value.match(/^[a-z][a-z0-9_]*$/) !== null && value.length > 2)
    );
}

/**
 * Get a short icon/emoji for a field based on its key
 */
export function getFieldIcon(fieldKey: string): string | null {
    const iconMap: Record<string, string> = {
        // Timeframes
        'timeframe': '⏱️',
        'htf': '📊',
        'ltf': '📈',

        // Modes and settings
        'mode': '⚙️',
        'mode_input': '⚙️',
        'test_mode': '🔍',

        // Levels and prices
        'level_ref': '🎯',
        'tolerance_bps_input': '±',

        // Volume and effort
        'volume_mode': '📊',
        'volume_mult_input': '×',

        // Ratios and percentages
        'depth_ratios_inputs': '📉',
        'tail_max_ratio_input': '📏',
        'effort_wave_position_range_input': '📍',
        'max_pct_input': '%',

        // Bars and candles
        'wave_min_bars_input': '🕯️',
        'min_bars_input': '🕯️',
        'max_bars_input': '🕯️',

        // Risk/Reward
        'min_rr_input': '⚖️',
        'sl_buffer_bps_input': '🛡️',
    };

    return iconMap[fieldKey] || null;
}

/**
 * Determine if a field is important enough to show in compact mode
 */
export function isImportantField(fieldKey: string): boolean {
    // Always show these fields
    const importantFields = [
        'mode', 'mode_input', 'test_mode',
        'depth_ratios_inputs',
        'min_bars_input', 'wave_min_bars_input',
        'tolerance_bps_input',
        'min_rr_input',
        'volume_mult_input',
        'level_ref',
    ];

    return importantFields.includes(fieldKey);
}
