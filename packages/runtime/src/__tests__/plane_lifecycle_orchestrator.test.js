"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PlaneLifecycleOrchestrator_1 = require("../PlaneLifecycleOrchestrator");
function baseEvent(overrides = {}) {
    return {
        id: 'ev-1',
        runId: 'run-1',
        projectId: 'TRADE-74',
        chainId: 'thread-1',
        type: 'run.started',
        payload: {
            status: 'in_progress',
            actorRole: 'PM Orchestrator',
            sourceStage: 'intake',
            targetStage: 'research',
        },
        timestamp: Date.now(),
        ...overrides,
    };
}
(0, globals_1.describe)('PlaneLifecycleOrchestrator', () => {
    (0, globals_1.it)('skips sync for chat-only issue refs', () => {
        (0, globals_1.expect)((0, PlaneLifecycleOrchestrator_1.shouldSyncIssueRef)('chat-123')).toBe(false);
        (0, globals_1.expect)((0, PlaneLifecycleOrchestrator_1.shouldSyncIssueRef)('TRADE-74')).toBe(true);
    });
    (0, globals_1.it)('maps runtime events to Plane states', () => {
        (0, globals_1.expect)((0, PlaneLifecycleOrchestrator_1.mapRuntimeEventToPlaneStateId)(baseEvent({ type: 'run.started' }))).toBe('a527fbdc-21ad-4839-b1ec-0480b062aa44');
        (0, globals_1.expect)((0, PlaneLifecycleOrchestrator_1.mapRuntimeEventToPlaneStateId)(baseEvent({ type: 'run.completed' }))).toBe('fff4dba0-d863-4a59-ab55-fd6f8bee9c79');
        (0, globals_1.expect)((0, PlaneLifecycleOrchestrator_1.mapRuntimeEventToPlaneStateId)(baseEvent({ type: 'run.failed' }))).toBe('226d57d1-0aeb-4c05-b961-23527ae34d33');
    });
    (0, globals_1.it)('builds deterministic lifecycle comment payload', () => {
        const html = (0, PlaneLifecycleOrchestrator_1.buildLifecycleComment)(baseEvent({ type: 'research.completed', payload: { status: 'success', actorRole: 'Research Agent' } }));
        (0, globals_1.expect)(html).toContain('research.completed');
        (0, globals_1.expect)(html).toContain('Research Agent');
        (0, globals_1.expect)(html).toContain('run-1');
        (0, globals_1.expect)(html).toContain('thread-1');
    });
    (0, globals_1.it)('flags orphan parent link and missing owner as continuity issues', () => {
        const continuity = (0, PlaneLifecycleOrchestrator_1.evaluateContinuityGuard)({
            issue: {
                id: 'issue-1',
                parent: 'missing-parent',
                state: 'a527fbdc-21ad-4839-b1ec-0480b062aa44',
                assignees: [],
                updated_at: new Date().toISOString(),
            },
            parentExists: false,
        });
        (0, globals_1.expect)(continuity.issues).toContain('orphan_parent_link');
        (0, globals_1.expect)(continuity.issues).toContain('missing_owner');
    });
    (0, globals_1.it)('flags stuck in-progress issue as warning', () => {
        const oldTs = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
        const continuity = (0, PlaneLifecycleOrchestrator_1.evaluateContinuityGuard)({
            issue: {
                id: 'issue-2',
                state: 'a527fbdc-21ad-4839-b1ec-0480b062aa44',
                assignees: [{ id: 'owner-1' }],
                updated_at: oldTs,
            },
            parentExists: true,
            nowMs: Date.now(),
            stuckHoursThreshold: 24,
        });
        (0, globals_1.expect)(continuity.warnings.some((w) => w.startsWith('stuck_in_progress_'))).toBe(true);
    });
    (0, globals_1.it)('blocks terminal transition when continuity issues are present', () => {
        const blocked = (0, PlaneLifecycleOrchestrator_1.shouldBlockTerminalTransition)({
            event: baseEvent({ type: 'run.completed' }),
            continuity: { issues: ['missing_owner'], warnings: [] },
        });
        (0, globals_1.expect)(blocked).toBe(true);
    });
});
