"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectEventEvidence = collectEventEvidence;
const events_1 = require("@system/events");
async function collectEventEvidence(runId) {
    const events = await events_1.EventStore.getEventsByRunId(runId);
    const stageStarted = events.filter((e) => String(e.type || e.event_type) === 'stage.started').length;
    const agentStarted = events.filter((e) => String(e.type || e.event_type) === 'agent.started').length;
    const handoffs = events.filter((e) => {
        const t = String(e.type || e.event_type);
        return t === 'swarm.handoff' || t === 'swarm_handoff';
    }).length;
    return {
        total: events.length,
        stageStarted,
        agentStarted,
        handoffs,
    };
}
