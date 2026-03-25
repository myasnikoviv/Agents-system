// Strategy types for frontend

export interface Strategy {
    id: string;
    name: string;
    description: string;
    created_at: number;
    updated_at: number;
    is_active: number;
    meta_json: string;
    viewport_x?: number;
    viewport_y?: number;
    zoom?: number;
    hide_done_lines?: number;
}

export interface StrategyBlock {
    id: string;
    strategy_id: string;
    type: string;
    title: string | null;
    timeframe: string;
    position_x: number;
    position_y: number;
    enabled: number;
    mock_json?: string | null;
    ui_order: number;
    config_json: string;
}

export interface StrategyEdge {
    id: string;
    strategy_id: string;
    from_block_id: string;
    to_block_id: string;
    edge_type: string;
    condition_json: string | null;
    ui_label: string | null;
    ui_order: number;
}

export interface StrategyInput {
    id: string;
    strategy_id: string;
    key: string;
    type: string;
    value_json: string;
    constraints_json: string | null;
    description: string | null;
    ui_group: string | null;
    ui_order: number;
    is_tunable: number;
}

export interface StrategyWithDetails extends Strategy {
    blocks: StrategyBlock[];
    edges: StrategyEdge[];
    inputs: StrategyInput[];
}
