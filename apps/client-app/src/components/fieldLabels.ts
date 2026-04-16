// Human-readable field labels and hints
export const fieldLabels: Record<string, string> = {
    // Common fields
    scope: "Data Scope",
    mode_input: "Mode Setting",
    timeframe: "Timeframe",

    // WAIT_TEST
    depth_ratios_inputs: "Price Dip Levels (%)",
    wave_min_bars_input: "Minimum Wave Length",
    test_mode: "Test Mode",
    max_wait_bars_input: "Maximum Wait Bars",
    depth_source_input: "Test Depth Source",

    // FIND_WAVE
    min_bars_input: "Minimum Bars",
    setup_min_bars_input: "Setup Wave Minimum Bars",
    retrace_min_bars_input: "Retrace Wave Minimum Bars",
    max_opposite_bars_input: "Max Opposite Bars In Leg",
    max_opposite_bars_ratio_input: "Max Opposite Bars Ratio In Leg",
    result_trend_break_bars_input: "Result Trend Break Bars",
    directional_bars_ratio_min_input: "Directional Bars Ratio Min",
    min_vector_angle_deg_input: "Minimum Wave Vector Angle (deg)",
    require_break_input: "Require Break of Previous Extreme",
    wave_mode_input: "Wave Mode",
    wave_retrace_min_bars: "Wave Retrace Minimum Bars",
    wave_max_opposite_bars: "Wave Max Opposite Bars",
    wave_max_opposite_bars_ratio: "Wave Max Opposite Bars Ratio",
    wave_result_trend_break_bars: "Wave Result Trend Break Bars",

    // FIND_EFFORT_BAR
    tail_mode: "Wick Mode",
    tail_max_ratio_input: "Maximum Wick Ratio",
    volume_mode: "Volume Calculation",
    volume_mult_input: "Volume Multiplier",
    effort_wave_position_range_input: "Effort Position Range In Wave",
    extreme_offset_ratio_input: "Terminal Extreme Offset Ratio",
    allow_absorption_push_input: "Allow Absorption Push",
    pressure_body_min_ratio_input: "Pressure Body Min Ratio",
    pressure_opp_tail_max_ratio_input: "Pressure Opposite Tail Max Ratio",
    effort_pick_mode_input: "Effort Pick Mode",

    // WAIT_RETURN_TO_LEVEL
    tolerance_bps_input: "Price Tolerance (basis points)",
    touch_mode: "Touch Mode",
    level_ref: "Reference Level",

    // VOLATILITY_DAMPING
    max_pct_input: "Maximum Volatility (%)",
    avg_range_sma_period_input: "Average Range Period",
    damping_window_bars_input: "Damping Window Bars",
    damping_required_pass_bars_input: "Required Calm Bars",

    // CONFIRM_BREAK
    min_break_bars_input: "Minimum Break Bars",

    // BUILD_STOP_LIMIT_TRADE
    min_rr_input: "Minimum Risk/Reward Ratio",
    sl_buffer_bps_input: "Stop Loss Buffer (bps)",

    // WAIT_WEAK_RESUMPTION
    max_bars_input: "Maximum Bars",

    // SET_MANIP_LEVEL
    source: "Data Source",
    mode: "Calculation Mode",

    // DETECT_DUMP_TOUCH_EXTREME
    atr_period_input: "ATR Period",
    wide_min_input: "Wide Spread Min (ATR)",
    wide_max_input: "Wide Spread Max (ATR)",
    require_wide_spread: "Require Wide Spread",

    // LIQUIDITY_FILTER
    min_turnover_input: "Minimum 24h Volume (USD)",

    // BRANCH
    entry_variant_mode: "Entry Variant Mode",
};

export const fieldHints: Record<string, string> = {
    scope: "Which price data to analyze: last wave, current candle, or full history",
    depth_ratios_inputs: "How much price must drop before considering it a dip (in decimal, e.g. 0.333 = 33.3%)",
    wave_min_bars_input: "Minimum number of candles required to form a valid wave",
    mode_input: "Reference to strategy input that determines the mode",
    max_wait_bars_input: "Maximum number of bars to wait for a valid test",

    tail_mode: "How to analyze candle wicks: directional (trend-aligned) or any",
    tail_max_ratio_input: "Maximum allowed wick size as ratio of candle body",
    volume_mode: "How to calculate volume threshold: wave average multiplier or absolute",
    volume_mult_input: "Multiplier for average wave volume to detect effort",
    effort_wave_position_range_input: "Allowed effort position range inside wave: 0=start extreme, 1=terminal extreme",
    extreme_offset_ratio_input: "Fraction of wave range excluded near terminal extreme (UP: near high, DOWN: near low)",
    allow_absorption_push_input: "Allow directional absorption push setup as valid effort signal",
    pressure_body_min_ratio_input: "Minimum candle body ratio for pressure-style effort candidate",
    pressure_opp_tail_max_ratio_input: "Maximum opposite-tail ratio for pressure-style effort candidate",
    effort_pick_mode_input: "Effort selection mode (runtime currently enforces ALL)",

    tolerance_bps_input: "How close price must get to level (1 bps = 0.01%)",
    touch_mode: "Level interaction: must pierce through or just touch",

    max_pct_input: "Maximum volatility percentage to allow entry",
    avg_range_sma_period_input: "Period for calculating average candle range",
    damping_window_bars_input: "How many recent bars to evaluate for volatility damping (window)",
    damping_required_pass_bars_input: "Minimum number of bars in the window that must satisfy damping condition",

    min_rr_input: "Minimum reward-to-risk ratio required for trade (e.g. 3.0 means 3x profit vs loss)",
    sl_buffer_bps_input: "Extra buffer added to stop loss in basis points",

    test_mode: "How to detect test: by individual candles or by full wave",
    wave_mode_input: "Wave qualification mode: strict (no opposite bars) or structural leg (allows opposite bars inside leg)",
    setup_min_bars_input: "Minimum directional bars required for setup/result wave qualification",
    retrace_min_bars_input: "Minimum directional bars required for retrace wave qualification",
    max_opposite_bars_input: "Maximum number of opposite-direction bars allowed inside a structural wave leg before zigzag split",
    max_opposite_bars_ratio_input: "Additional opposite-run allowance as fraction of current leg length (0..1). Effective limit = max(fixed bars, floor(leg bars × ratio)).",
    result_trend_break_bars_input: "Consecutive opposite-direction bars required to treat left/result trend as broken (0 = disabled)",
    directional_bars_ratio_min_input: "Minimum fraction of bars aligned with wave direction (0..1). Example: 0.7 means at least 70% directional bars.",
    min_vector_angle_deg_input: "Minimum geometric angle of wave vector vs horizontal (degrees). 0 disables this filter.",
    require_wide_spread: "Whether candle spread must be wide (2-3 ATR)",
    depth_source_input: "Depth calculation source: close, wick, or close_or_wick",

    entry_variant_mode: "Select Auto to choose first detected setup, or force V1/V2 manually",
};

export const enumOptions: Record<string, Array<{ value: string; label: string }>> = {
    scope: [
        { value: 'LAST_WAVE', label: 'Last Price Wave' },
        { value: 'CURRENT_CANDLE', label: 'Current Candle Only' },
        { value: 'FULL_HISTORY', label: 'Full Chart History' },
    ],

    tail_mode: [
        { value: 'DIRECTIONAL', label: 'Directional (Trend-Aligned Wick)' },
        { value: 'ANY', label: 'Any Direction' },
    ],

    volume_mode: [
        { value: 'WAVE_AVG_MULT', label: 'Wave Average × Multiplier' },
        { value: 'ABSOLUTE', label: 'Absolute Volume Threshold' },
    ],
    effort_pick_mode_input: [
        { value: 'ALL', label: 'All Candidates (Session Fanout)' },
    ],

    touch_mode: [
        { value: 'PIERCE', label: 'Must Pierce Through Level' },
        { value: 'TOUCH', label: 'Touch Level Only' },
    ],

    source: [
        { value: 'TEST_RESULT', label: 'From Test Result' },
        { value: 'LTF_TEST', label: 'From LTF Test' },
        { value: 'EFFORT_BAR', label: 'From Effort Bar' },
    ],

    mode: [
        { value: 'LEVEL_FROM_TEST', label: 'Level From Test' },
        { value: 'EXTREME', label: 'Wave Extreme' },
    ],

    test_mode: [
        { value: 'by_candle', label: 'Test by Individual Candle' },
        { value: 'by_wave', label: 'Test by Full Wave' },
    ],
    wave_mode_input: [
        { value: 'STRICT_RESULTATIVE', label: 'Strict Resultative' },
        { value: 'STRUCTURAL_LEG', label: 'Structural Leg' },
    ],
    depth_source_input: [
        { value: 'close', label: 'Close Only' },
        { value: 'wick', label: 'Wick Only' },
        { value: 'close_or_wick', label: 'Close or Wick' },
    ],
    test_depth_source: [
        { value: 'close', label: 'Close Only' },
        { value: 'wick', label: 'Wick Only' },
        { value: 'close_or_wick', label: 'Close or Wick' },
    ],

    timeframe: [
        { value: 'HTF', label: 'Higher Timeframe (HTF)' },
        { value: 'LTF', label: 'Lower Timeframe (LTF)' },
        { value: '1m', label: '1 Minute' },
        { value: '3m', label: '3 Minutes' },
        { value: '5m', label: '5 Minutes' },
        { value: '15m', label: '15 Minutes' },
        { value: '30m', label: '30 Minutes' },
        { value: '1h', label: '1 Hour' },
        { value: '2h', label: '2 Hours' },
        { value: '4h', label: '4 Hours' },
        { value: '6h', label: '6 Hours' },
        { value: '12h', label: '12 Hours' },
        { value: '1d', label: '1 Day' },
        { value: '1w', label: '1 Week' },
    ],

    entry_variant_mode: [
        { value: 'auto', label: 'Auto (first detected setup)' },
        { value: 'v1', label: 'Variant 1 (Effort Bar)' },
        { value: 'v2', label: 'Variant 2 (Volume Bar)' },
    ],
};

// Slider configurations for numeric fields
export const sliderConfigs: Record<string, { min: number; max: number; step: number; suffix?: string }> = {
    // Ratios (0-1)
    tail_max_ratio_input: { min: 0.1, max: 0.6, step: 0.01 },
    depth_ratios_inputs: { min: 0.1, max: 0.9, step: 0.01 },

    // Multipliers
    volume_mult_input: { min: 1.0, max: 3.0, step: 0.1, suffix: 'x' },
    extreme_offset_ratio_input: { min: 0.0, max: 0.9, step: 0.01 },
    pressure_body_min_ratio_input: { min: 0.2, max: 0.9, step: 0.01 },
    pressure_opp_tail_max_ratio_input: { min: 0.05, max: 0.5, step: 0.01 },

    // Bars/Candles
    wave_min_bars_input: { min: 1, max: 100, step: 1, suffix: ' candles' },
    setup_min_bars_input: { min: 1, max: 100, step: 1, suffix: ' candles' },
    retrace_min_bars_input: { min: 0, max: 50, step: 1, suffix: ' candles' },
    max_opposite_bars_input: { min: 0, max: 8, step: 1, suffix: ' bars' },
    max_opposite_bars_ratio_input: { min: 0.0, max: 1.0, step: 0.01 },
    result_trend_break_bars_input: { min: 0, max: 12, step: 1, suffix: ' bars' },
    directional_bars_ratio_min_input: { min: 0.0, max: 1.0, step: 0.01 },
    min_vector_angle_deg_input: { min: 0, max: 89, step: 1, suffix: '°' },
    max_wait_bars_input: { min: 1, max: 100, step: 1, suffix: ' bars' },
    min_break_bars_input: { min: 1, max: 10, step: 1, suffix: ' bars' },
    max_bars_input: { min: 1, max: 20, step: 1, suffix: ' bars' },
    avg_range_sma_period_input: { min: 5, max: 100, step: 1, suffix: ' periods' },
    damping_window_bars_input: { min: 1, max: 10, step: 1, suffix: ' bars' },
    damping_required_pass_bars_input: { min: 1, max: 10, step: 1, suffix: ' bars' },
    atr_period_input: { min: 7, max: 50, step: 1, suffix: ' periods' },

    // Percentages
    max_pct_input: { min: 0.001, max: 0.03, step: 0.001, suffix: '%' },

    // Basis points
    tolerance_bps_input: { min: 0, max: 25, step: 1, suffix: ' bps' },
    sl_buffer_bps_input: { min: 0, max: 30, step: 1, suffix: ' bps' },

    // Risk/Reward
    min_rr_input: { min: 1.0, max: 8.0, step: 0.1, suffix: ':1' },

    // ATR multiples
    wide_min_input: { min: 1.0, max: 5.0, step: 0.1, suffix: ' ATR' },
    wide_max_input: { min: 1.0, max: 6.0, step: 0.1, suffix: ' ATR' },

    // Volume
    min_turnover_input: { min: 0, max: 1000000000, step: 1000000, suffix: ' USD' },
};
