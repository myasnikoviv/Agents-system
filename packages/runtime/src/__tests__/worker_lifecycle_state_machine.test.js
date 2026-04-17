"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WorkerLifecycleStateMachine_1 = require("../workers/WorkerLifecycleStateMachine");
describe('WorkerLifecycleStateMachine', () => {
    it('allows deterministic valid transitions', () => {
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('cold', 'starting')).toBe(true);
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('starting', 'hot')).toBe(true);
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('hot', 'active')).toBe(true);
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('active', 'idle')).toBe(true);
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('idle', 'active')).toBe(true);
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('stopping', 'cold')).toBe(true);
        expect((0, WorkerLifecycleStateMachine_1.canTransition)('failed', 'cold')).toBe(true);
    });
    it('rejects invalid transitions', () => {
        const invalid = (0, WorkerLifecycleStateMachine_1.applyLifecycleTransition)('cold', 'active');
        expect(invalid.ok).toBe(false);
        if (invalid.ok === false) {
            expect(invalid.reason).toContain('invalid_transition:cold->active');
        }
    });
});
