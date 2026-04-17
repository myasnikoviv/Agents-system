"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPipelineUsageGate = logPipelineUsageGate;
const GovernanceLogger_1 = require("./GovernanceLogger");
function logPipelineUsageGate(input) {
    // If pipeline is 'unified-task-intake' and it was a "default" (non-explicit), warn.
    const isDefaultIntake = input.pipelineId === 'unified-task-intake' && !input.isExplicit;
    if (isDefaultIntake && input.confidence < 0.3) {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'pipeline_usage',
            status: 'fail',
            action: 'allow',
            ticket: input.ticketId,
            runId: input.runId,
            chainId: input.chainId,
            detail: `low_confidence_default: confidence=${input.confidence.toFixed(2)}`,
        });
    }
    else {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'pipeline_usage',
            status: 'pass',
            action: 'allow',
            ticket: input.ticketId,
            runId: input.runId,
            chainId: input.chainId,
            detail: `pipeline=${input.pipelineId}, explicit=${input.isExplicit}`,
        });
    }
}
