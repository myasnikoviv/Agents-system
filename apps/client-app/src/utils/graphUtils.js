"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yamlToGraph = void 0;
const react_1 = require("@xyflow/react");
const js_yaml_1 = __importDefault(require("js-yaml"));
/**
 * Extracts a smart, readable label from a transition condition
 */
const extractSmartLabel = (condition) => {
    if (!condition)
        return '';
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
const yamlToGraph = (yamlContent, onEdit, onDelete) => {
    const nodes = [];
    const edges = [];
    if (!yamlContent.trim())
        return { nodes, edges };
    let dsl;
    try {
        dsl = js_yaml_1.default.load(yamlContent);
    }
    catch (e) {
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
            if (!t.to)
                return;
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
                markerEnd: { type: react_1.MarkerType.ArrowClosed },
                style: {
                    stroke: t.actions && t.actions.length > 0 ? '#4CAF50' : '#888',
                    strokeWidth: 2
                },
                labelBgPadding: [8, 4],
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
exports.yamlToGraph = yamlToGraph;
