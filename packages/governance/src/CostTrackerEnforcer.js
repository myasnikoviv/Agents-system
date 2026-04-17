"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logCostTrackerGate = logCostTrackerGate;
const GovernanceLogger_1 = require("./GovernanceLogger");
function logCostTrackerGate(input) {
    // Estimated cost (rough calculation)
    // assuming $10 / 1M tokens combined as a very rough average
    const estimatedCostUsd = (input.totalTokens / 1000000) * 10;
    (0, GovernanceLogger_1.logGovernance)({
        rule: 'cost_tracking',
        status: 'pass',
        action: 'allow',
        ticket: input.ticketId,
        runId: input.runId,
        chainId: input.chainId,
        // Add multiple details as a single text for structured log (or add an object to logEntry later)
        detail: `agent=${input.agentSlug}, runId=${input.runId}, tokens=${input.totalTokens}, est_cost=$${estimatedCostUsd.toFixed(4)}`,
    });
}
