"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FailureClassifier_1 = require("../control-plane/FailureClassifier");
const RestartPolicyEngine_1 = require("../control-plane/RestartPolicyEngine");
describe('Failure classification (AGSYS-2712)', () => {
    it('classifies crash vs degraded vs timeout', () => {
        const crash = (0, FailureClassifier_1.classifyFailure)({
            serviceId: 'api',
            desired: 'running',
            status: 'failed',
            restartCount: 0,
            lastCheckAt: null,
            errorReason: 'segmentation fault',
        });
        const degraded = (0, FailureClassifier_1.classifyFailure)({
            serviceId: 'worker',
            desired: 'running',
            status: 'degraded',
            restartCount: 0,
            lastCheckAt: null,
            errorReason: 'heartbeat missing',
        });
        const timeout = (0, FailureClassifier_1.classifyFailure)({
            serviceId: 'redis',
            desired: 'running',
            status: 'failed',
            restartCount: 0,
            lastCheckAt: null,
            errorReason: 'request timeout while probing',
        });
        expect(crash.kind).toBe('crash');
        expect(degraded.kind).toBe('degraded');
        expect(timeout.kind).toBe('timeout');
    });
    it('records failure reason in telemetry stream', () => {
        const telemetry = new FailureClassifier_1.FailureTelemetryBuffer();
        const classified = (0, FailureClassifier_1.classifyFailure)({
            serviceId: 'backend',
            desired: 'running',
            status: 'failed',
            restartCount: 1,
            lastCheckAt: null,
            errorReason: 'connection timeout',
        });
        telemetry.push(classified.telemetry);
        const events = telemetry.list();
        expect(events.length).toBe(1);
        expect(events[0].reason).toContain('timeout');
        expect(events[0].kind).toBe('timeout');
    });
    it('feeds failure classification into restart logic', () => {
        const policy = new RestartPolicyEngine_1.RestartPolicyEngine();
        const classified = (0, FailureClassifier_1.classifyFailure)({
            serviceId: 'dispatcher',
            desired: 'running',
            status: 'failed',
            restartCount: 1,
            lastCheckAt: null,
            errorReason: 'request timed out',
        });
        const decision = policy.decide('dispatcher', {
            type: 'worker',
            runtime: 'node',
            desired: { state: 'running', restartPolicy: { mode: 'on-failure', maxRetries: 4, backoffMs: 100 } },
        }, {
            serviceId: 'dispatcher',
            desired: 'running',
            status: 'failed',
            restartCount: 1,
            lastCheckAt: null,
            errorReason: 'request timed out',
        }, classified.kind);
        expect(classified.kind).toBe('timeout');
        expect(decision.allowed).toBe(true);
    });
});
