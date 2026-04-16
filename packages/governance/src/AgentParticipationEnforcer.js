"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logParticipationGate = logParticipationGate;
const GovernanceLogger_1 = require("./GovernanceLogger");
function logParticipationGate(input) {
    const content = input.content.toLowerCase();
    const markers = [
        'perceive', 'think', 'plan', 'act', 'reflect',
        'сприйняття', 'думка', 'план', 'дія', 'рефлексія', // UK
        'восприятие', 'мысль', 'план', 'действие', 'рефлексия' // RU
    ];
    // For ENF-005 MVP, search for ANY of these markers or specific structured headers.
    // AGENTS.md requires these for cognitive loops.
    const found = markers.some(m => content.includes(m));
    if (found) {
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'agent_participation',
            status: 'pass',
            action: 'allow',
            ticket: input.ticketId,
            runId: input.runId,
            chainId: input.chainId,
            detail: `agent=${input.agentSlug}, cognitive_loop_markers_detected`,
        });
    }
    else {
        // FAIL soft gate → log + warn, but allow
        (0, GovernanceLogger_1.logGovernance)({
            rule: 'agent_participation',
            status: 'fail',
            action: 'allow',
            ticket: input.ticketId,
            runId: input.runId,
            chainId: input.chainId,
            detail: `agent=${input.agentSlug}, cognitive_loop_markers_missing`,
        });
    }
}
