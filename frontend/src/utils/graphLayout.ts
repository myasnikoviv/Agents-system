import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import type { StrategyBlock, StrategyEdge } from '../types/strategy';

// Swimlane configuration for different timeframes (Legacy - kept for background rendering)
export const SWIMLANE_CONFIG = {
    GLOBAL: {
        y: 20,
        height: 200,
        color: '#1a1a2e',
        label: 'GLOBAL',
    },
    HTF: {
        y: 250,
        height: 280,
        color: '#16213e',
        label: 'HTF (Higher Timeframe)',
    },
    LTF: {
        y: 560,
        height: 280,
        color: '#0f3460',
        label: 'LTF (Lower Timeframe)',
    },
} as const;



const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

/**
 * Auto-layout blocks using Dagre (Vertical TB)
 * Only applies layout if positions are 0,0 (reset state)
 */
export function layoutBlocks(blocks: StrategyBlock[], edges: StrategyEdge[] = []): Node[] {
    // If any block has non-zero position, we assume manual layout or already layouted
    // But if we want to force layout, the caller should have reset positions to 0
    const needsLayout = blocks.length > 0 && blocks.every(b => b.position_x === 0 && b.position_y === 0);

    if (!needsLayout) {
        // Just map to Nodes without changing positions
        return blocks.map(block => {
            let mockLabel: string | null = null;
            try {
                const mockCfg = block.mock_json ? JSON.parse(block.mock_json) : null;
                if (mockCfg?.mode === 'force_edge' && mockCfg.route_to) {
                    const edge = edges.find(e => e.from_block_id === block.id && e.to_block_id === mockCfg.route_to);
                    const target = blocks.find(b => b.id === mockCfg.route_to);
                    mockLabel = edge?.ui_label || target?.title || target?.type || mockCfg.route_to;
                }
            } catch {
                /* ignore parse errors */
            }
            return {
            id: block.id,
            type: 'customBlock',
            position: { x: block.position_x, y: block.position_y },
            data: {
                block,
                label: block.title || block.type,
                type: block.type,
                timeframe: block.timeframe,
                mock_json: block.mock_json,
                mock_label: mockLabel
            },
        };
        });
    }

    // Initialize Dagre graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    blocks.forEach((block) => {
        g.setNode(block.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Add edges
    edges.forEach((edge) => {
        g.setEdge(edge.from_block_id, edge.to_block_id);
    });

    // Calculate layout
    dagre.layout(g);

    // Map back to ReactFlow nodes
    return blocks.map((block) => {
        const nodeWithPos = g.node(block.id);

        // Dagre gives center coordinates; React Flow needs top-left
        const x = nodeWithPos.x - NODE_WIDTH / 2;
        const y = nodeWithPos.y - NODE_HEIGHT / 2;

        let mockLabel: string | null = null;
        try {
            const mockCfg = block.mock_json ? JSON.parse(block.mock_json) : null;
            if (mockCfg?.mode === 'force_edge' && mockCfg.route_to) {
                const edge = edges.find(e => e.from_block_id === block.id && e.to_block_id === mockCfg.route_to);
                const target = blocks.find(b => b.id === mockCfg.route_to);
                mockLabel = edge?.ui_label || target?.title || target?.type || mockCfg.route_to;
            }
        } catch { 
            /* ignore parse errors during layout */
        }

        return {
            id: block.id,
            type: 'customBlock',
            position: { x, y },
            data: {
                block,
                label: block.title || block.type,
                type: block.type,
                timeframe: block.timeframe,
                mock_json: block.mock_json,
                mock_label: mockLabel
            },
        };
    });
}

/**
 * Convert database edges to ReactFlow edges
 */
export function layoutEdges(edges: StrategyEdge[]): Edge[] {
    return edges.map((edge) => ({
        id: edge.id,
        source: edge.from_block_id,
        target: edge.to_block_id,
        type: 'customEdge',
        label: edge.ui_label || undefined,
        data: {
            edgeType: edge.edge_type,
            condition: edge.condition_json,
        },
        animated: edge.edge_type === 'SEQUENCE',
        style: {
            stroke: getEdgeColor(edge.edge_type),
            strokeWidth: 2,
        },
    }));
}

/**
 * Get edge color based on type
 */
function getEdgeColor(edgeType: string): string {
    switch (edgeType) {
        case 'SEQUENCE':
            return '#60a5fa'; // blue
        case 'IF_TRUE':
            return '#34d399'; // green
        case 'IF_FALSE':
            return '#f87171'; // red
        case 'BRANCH':
            return '#a78bfa'; // purple
        case 'MERGE':
            return '#fbbf24'; // yellow
        default:
            return '#9ca3af'; // gray
    }
}

/**
 * Get swimlane background rectangles for rendering
 */
export function getSwimlaneBackgrounds() {
    return Object.entries(SWIMLANE_CONFIG).map(([name, config]) => ({
        name,
        ...config,
    }));
}
