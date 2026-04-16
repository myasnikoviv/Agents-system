"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCockpitEvents = void 0;
const react_1 = require("react");
const http_1 = require("../../../lib/http");
const useCockpitEvents = (activeThreadKey, agentRegistry, appendAgentMessageIfChanged) => {
    const [eventsByThread, setEventsByThread] = (0, react_1.useState)({});
    const [agentRuntime, setAgentRuntime] = (0, react_1.useState)({});
    // Detailed telemetry state
    const [swarmWorkers, setSwarmWorkers] = (0, react_1.useState)([]);
    const [queueSnapshot, setQueueSnapshot] = (0, react_1.useState)({ waiting: [], assigned: [] });
    const [workerLifecycleTimeline, setWorkerLifecycleTimeline] = (0, react_1.useState)([]);
    const [workerDebugRows, setWorkerDebugRows] = (0, react_1.useState)([]);
    const activeThreadKeyRef = (0, react_1.useRef)(activeThreadKey);
    (0, react_1.useEffect)(() => { activeThreadKeyRef.current = activeThreadKey; }, [activeThreadKey]);
    const normalizeSseEvent = (raw) => {
        const timestamp = raw?.timestamp ?? Date.now();
        const timestampIso = typeof timestamp === 'number' ? new Date(timestamp).toISOString() : String(timestamp);
        const payload = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
        return {
            event_id: String(raw?.event_id || raw?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            event_type: String(raw?.event_type || raw?.type || '').trim(),
            timestamp: timestampIso,
            pipeline_run_id: String(raw?.pipeline_run_id || raw?.runId || ''),
            runId: String(raw?.runId || ''),
            chainId: String(raw?.chainId || raw?.thread_id || ''),
            agent_role: String(raw?.agent_role || raw?.actor?.role || raw?.actor?.id || 'system'),
            actor: raw?.actor || undefined,
            source_stage: String(raw?.source_stage || payload.stageId || ''),
            target_stage: String(raw?.target_stage || payload.nextStageId || ''),
            status: String(raw?.status || payload.status || ''),
            plane_issue_id: String(raw?.plane_issue_id || raw?.projectId || ''),
            payload
        };
    };
    (0, react_1.useEffect)(() => {
        const es = new EventSource((0, http_1.apiUrl)('/api/events/system-stream'));
        es.onmessage = (msg) => {
            try {
                const raw = JSON.parse(msg.data);
                const event = normalizeSseEvent(raw);
                const eventType = event.event_type || '';
                const threadKey = event.chainId || event.pipeline_run_id || '__global__';
                // 1. Thread-local events
                if (threadKey && threadKey !== '__global__') {
                    setEventsByThread(prev => ({ ...prev, [threadKey]: [...(prev[threadKey] || []), event] }));
                }
                // 2. Swarm Hierarchy / High-level status
                if (eventType.startsWith('worker.') || eventType === 'swarm_stage_completed' || eventType === 'swarm.handoff' || eventType === 'agent.started' || eventType === 'agent.completed' || eventType === 'agent.message') {
                    const slug = event.agent_role || 'system';
                    const resolvedSlug = (agentRegistry.find(a => a.callsign === slug || a.slug === slug)?.slug) || slug || 'system';
                    setAgentRuntime(prev => {
                        const existing = prev[resolvedSlug] || { slug: resolvedSlug, title: resolvedSlug, callsign: resolvedSlug, status: 'standby', currentStage: 'n/a', currentTask: 'n/a', currentIssue: 'n/a', threadId: threadKey, lastUpdated: new Date().toISOString() };
                        let status = existing.status;
                        if (eventType === 'agent.started' || eventType === 'agent.message')
                            status = 'active';
                        if (eventType === 'agent.completed' || eventType === 'swarm_stage_completed')
                            status = 'standby';
                        if (eventType === 'worker.unhealthy' || eventType === 'worker.failed')
                            status = 'unavailable';
                        return { ...prev, [resolvedSlug]: { ...existing, status, threadId: threadKey, lastUpdated: event.timestamp } };
                    });
                    // Track lifecycle events
                    if (eventType === 'worker.spawned' || eventType === 'worker.failed' || eventType === 'agent.started' || eventType === 'agent.completed') {
                        setWorkerLifecycleTimeline(prev => [event, ...prev].slice(0, 50));
                    }
                    // Track debug logs
                    setWorkerDebugRows(prev => [event, ...prev].slice(0, 100));
                }
                // 3. Worker Inventory (SSE push for all workers status)
                if (eventType === 'swarm.inventory.update' || eventType === 'worker.inventory') {
                    if (Array.isArray(event.payload?.workers)) {
                        setSwarmWorkers(event.payload.workers);
                    }
                }
                // 4. Queue Telemetry
                if (eventType === 'swarm.queue.update' || eventType === 'queue.snapshot') {
                    if (event.payload?.waiting || event.payload?.assigned) {
                        setQueueSnapshot({
                            waiting: Array.isArray(event.payload.waiting) ? event.payload.waiting : [],
                            assigned: Array.isArray(event.payload.assigned) ? event.payload.assigned : []
                        });
                    }
                }
                // 5. Agent Chat Link
                if (threadKey === activeThreadKeyRef.current && eventType === 'agent.message') {
                    appendAgentMessageIfChanged(threadKey, event.payload?.message || '', new Date(event.timestamp));
                }
            }
            catch (e) {
                console.error("SSE parse error", e);
            }
        };
        return () => es.close();
    }, [agentRegistry, appendAgentMessageIfChanged]);
    const activeEvents = eventsByThread[activeThreadKey] || [];
    const agentStatusRows = (0, react_1.useMemo)(() => Object.values(agentRuntime), [agentRuntime]);
    const sortedAgentStatusRows = (0, react_1.useMemo)(() => [...agentStatusRows].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)), [agentStatusRows]);
    const swarmSummary = (0, react_1.useMemo)(() => {
        const workers = swarmWorkers.length > 0 ? swarmWorkers : Object.values(agentRuntime);
        const total = swarmWorkers.length > 0 ? swarmWorkers.length : workers.length;
        const active = swarmWorkers.length > 0 ? swarmWorkers.filter(w => w.executionState === 'active').length : workers.filter(w => w.status === 'active').length;
        const standby = swarmWorkers.length > 0 ? swarmWorkers.filter(w => w.executionState === 'standby').length : workers.filter(w => w.status === 'standby').length;
        const unhealthy = swarmWorkers.length > 0 ? swarmWorkers.filter(w => w.availabilityState === 'cold' || w.heartbeatFreshness === 'dead').length : workers.filter(w => w.status === 'unavailable').length;
        return {
            workersTotal: Math.max(total, 0),
            activeWorkers: active,
            standbyWorkers: standby,
            unhealthyWorkers: unhealthy,
            queuePressure: queueSnapshot.waiting.length
        };
    }, [agentRuntime, swarmWorkers, queueSnapshot]);
    const resourcePressure = (0, react_1.useMemo)(() => {
        const ratio = swarmSummary.activeWorkers > 0 ? (swarmSummary.queuePressure + swarmSummary.activeWorkers) / Math.max(1, swarmSummary.workersTotal) : 0;
        if (ratio >= 1.5)
            return { label: 'overload', className: 'text-red-400' };
        if (ratio >= 0.8)
            return { label: 'high', className: 'text-amber-300' };
        return { label: 'normal', className: 'text-emerald-400' };
    }, [swarmSummary]);
    return {
        eventsByThread,
        activeEvents,
        swarmSummary,
        agentStatusRows,
        sortedAgentStatusRows,
        resourcePressure,
        swarmWorkers,
        queueSnapshot,
        workerLifecycleTimeline,
        workerDebugRows,
        setEventsByThread
    };
};
exports.useCockpitEvents = useCockpitEvents;
