"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EnvironmentLifecycle_1 = require("../environment/EnvironmentLifecycle");
describe('EnvironmentLifecycle', () => {
    it('creates deterministic environment identity scoped by tenant/workspace/project', () => {
        const env = (0, EnvironmentLifecycle_1.createEnvironmentRecord)({ tenantId: 'tenant-a', workspaceId: 'workspace-a', projectId: 'project-a' });
        expect(env.environmentId).toBe('env:tenant-a:workspace-a:project:project-a');
        expect(env.state).toBe('provisioning');
    });
    it('defines allowed lifecycle transitions', () => {
        expect((0, EnvironmentLifecycle_1.canTransitionEnvironment)('provisioning', 'warming')).toBe(true);
        expect((0, EnvironmentLifecycle_1.canTransitionEnvironment)('warming', 'active')).toBe(true);
        expect((0, EnvironmentLifecycle_1.canTransitionEnvironment)('active', 'idle')).toBe(true);
        expect((0, EnvironmentLifecycle_1.canTransitionEnvironment)('terminated', 'active')).toBe(false);
    });
    it('returns transition event log payload on valid transition', () => {
        const env = (0, EnvironmentLifecycle_1.createEnvironmentRecord)({ tenantId: 't1', workspaceId: 'w1' });
        const transitioned = (0, EnvironmentLifecycle_1.transitionEnvironment)(env, 'warming', { reason: 'bootstrap', actorId: 'system-core', now: '2026-04-09T00:00:00.000Z' });
        expect('error' in transitioned).toBe(false);
        if ('error' in transitioned)
            return;
        expect(transitioned.next.state).toBe('warming');
        expect(transitioned.event.from).toBe('provisioning');
        expect(transitioned.event.to).toBe('warming');
        expect(transitioned.event.reason).toBe('bootstrap');
        expect(transitioned.event.actorId).toBe('system-core');
    });
    it('rejects invalid transition sequence', () => {
        const env = (0, EnvironmentLifecycle_1.createEnvironmentRecord)({ tenantId: 't1', workspaceId: 'w1', initialState: 'terminated' });
        const transitioned = (0, EnvironmentLifecycle_1.transitionEnvironment)(env, 'active');
        expect('error' in transitioned).toBe(true);
        if ('error' in transitioned) {
            expect(transitioned.error).toBe('invalid_transition:terminated->active');
        }
    });
    it('buildEnvironmentId helper supports project-less environments', () => {
        expect((0, EnvironmentLifecycle_1.buildEnvironmentId)({ tenantId: 't2', workspaceId: 'w2' })).toBe('env:t2:w2');
    });
});
