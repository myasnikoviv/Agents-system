
import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import yaml from 'js-yaml';

// Minimal types for DSL
interface StrategyDSL {
    stateMachine: {
        initial: string;
        states: StateDef[];
    };
    meta?: {
        name: string;
        version: string;
    };
}

interface StateDef {
    name: string;
    timeframe?: string;
    onEnter?: unknown[];
    transitions?: TransitionDef[];
}

interface TransitionDef {
    when: string;
    to: string;
    actions?: unknown[];
}

/**
 * Extracts a smart, readable label from a transition condition
 */
const extractSmartLabel = (condition: string): string => {
    if (!condition) return '';

    // Remove extra whitespace and newlines
    const cleaned = condition.trim().replace(/\s+/g, ' ');

    // Common patterns to simplify
    const patterns = [
        // var.something => something
        { regex: /var\.(\w+)/g, replacement: '$1' },
        // Remove "transactionDetail." prefix
        { regex: /transactionDetail\./g, replacement: '' },
        // Shorten comparison operators for readability
        { regex: /\s*===\s*/g, replacement: ' = ' },
        { regex: /\s*!==\s*/g, replacement: ' ≠ ' },
        { regex: /\s*>=\s*/g, replacement: ' ≥ ' },
        { regex: /\s*<=\s*/g, replacement: ' ≤ ' },
    ];

    let simplified = cleaned;
    patterns.forEach(({ regex, replacement }) => {
        simplified = simplified.replace(regex, replacement);
    });

    // If still too long, intelligently truncate
    if (simplified.length > 40) {
        // Try to find logical breaking points
        const breakPoints = [' && ', ' || ', ', '];
        for (const bp of breakPoints) {
            const idx = simplified.indexOf(bp);
            if (idx > 0 && idx < 40) {
                return simplified.slice(0, idx) + '…';
            }
        }
        // Fallback: simple truncation
        return simplified.slice(0, 37) + '…';
    }

    return simplified;
};

export const yamlToGraph = (yamlContent: string, onEdit?: (nodeName: string) => void, onDelete?: (nodeName: string) => void) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (!yamlContent.trim()) return { nodes, edges };

    let dsl: StrategyDSL;
    try {
        dsl = yaml.load(yamlContent) as StrategyDSL;
    } catch (e) {
        console.error("Failed to parse YAML", e);
        return { nodes, edges };
    }

    if (!dsl || !dsl.stateMachine || !dsl.stateMachine.states) {
        return { nodes, edges };
    }

    const states = dsl.stateMachine.states;
    const initial = dsl.stateMachine.initial;

    // Simple auto-layout (dagre-like placeholder or just grid)
    // For now, let's just place them in a circle or grid
    const SPACING_X = 300;
    const SPACING_Y = 180;
    const COLS = 3;

    states.forEach((state, index) => {
        const isInitial = state.name === initial;

        // Grid Layout
        const col = index % COLS;
        const row = Math.floor(index / COLS);

        // Build a more meaningful label
        const tfBadge = state.timeframe ? ` [${state.timeframe}]` : '';
        const transitionCount = state.transitions?.length || 0;
        const actionsCount = state.onEnter?.length || 0;

        nodes.push({
            id: state.name,
            position: { x: col * SPACING_X + 50, y: row * SPACING_Y + 50 },
            data: {
                label: `${state.name}${tfBadge}\n${actionsCount} actions, ${transitionCount} transitions`,
                isInitial,
                contents: state,
                onEdit,
                onDelete
            },
            type: 'stateNode', // Use custom node type
        });

        // Edges
        const transitions = state.transitions || [];
        transitions.forEach((t, tIdx) => {
            if (!t.to) return;

            const whenStr = typeof t.when === 'string' ? t.when : JSON.stringify(t.when);
            const smartLabel = extractSmartLabel(whenStr);

            edges.push({
                id: `${state.name}-${t.to}-${tIdx}`,
                source: state.name,
                target: t.to,
                label: smartLabel,
                data: {
                    fullCondition: whenStr, // Store full condition for tooltips/inspection
                    hasActions: t.actions && t.actions.length > 0
                },
                animated: true,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                style: {
                    stroke: t.actions && t.actions.length > 0 ? '#4CAF50' : '#888',
                    strokeWidth: 2
                },
                labelBgPadding: [8, 4] as [number, number],
                labelBgBorderRadius: 4,
                labelBgStyle: {
                    fill: '#1e1e1e',
                    fillOpacity: 0.9
                }
            });
        });
    });

    return { nodes, edges };
};
