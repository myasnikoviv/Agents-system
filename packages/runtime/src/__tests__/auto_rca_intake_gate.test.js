"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AutoRcaIntakeGate_1 = require("../AutoRcaIntakeGate");
describe('AutoRcaIntakeGate', () => {
    it('gates mutating pipelines', () => {
        expect((0, AutoRcaIntakeGate_1.shouldGateByPipeline)('new-feature')).toBe(true);
        expect((0, AutoRcaIntakeGate_1.shouldGateByPipeline)('feature-change')).toBe(true);
        expect((0, AutoRcaIntakeGate_1.shouldGateByPipeline)('unified-task-intake')).toBe(false);
    });
    it('allows bypass for explicit RCA remediation prompts', () => {
        expect((0, AutoRcaIntakeGate_1.shouldBypassAutoRcaGate)('Please resolve auto-rca follow-up tickets first')).toBe(true);
        expect((0, AutoRcaIntakeGate_1.shouldBypassAutoRcaGate)('Run self-improvement and retro on blockers')).toBe(true);
        expect((0, AutoRcaIntakeGate_1.shouldBypassAutoRcaGate)('Implement new dashboard widgets')).toBe(false);
    });
    it('filters unresolved auto-rca issues by state group', () => {
        const issues = [
            { id: '1', name: 'Auto-RCA follow-up: chat-1', state: 'todo' },
            { id: '2', name: 'Auto-RCA follow-up: chat-2', state: 'done' },
            { id: '3', name: 'Feature task', state: 'todo' },
            { id: '4', name: 'Auto-RCA follow-up: chat-4', state: 'cancelled' },
        ];
        const states = [
            { id: 'todo', group: 'unstarted' },
            { id: 'done', group: 'completed' },
            { id: 'cancelled', group: 'cancelled' },
        ];
        const unresolved = (0, AutoRcaIntakeGate_1.filterUnresolvedAutoRcaIssues)(issues, states);
        expect(unresolved.map((i) => i.id)).toEqual(['1']);
    });
});
