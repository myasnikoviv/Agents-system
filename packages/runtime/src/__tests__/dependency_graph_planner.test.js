"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DependencyGraphPlanner_1 = require("../DependencyGraphPlanner");
describe('DependencyGraphPlanner', () => {
    it('builds topological order for simple DAG', () => {
        const result = (0, DependencyGraphPlanner_1.buildDependencyPlan)([
            { id: 'intake' },
            { id: 'research', dependsOn: ['intake'] },
            { id: 'dev', dependsOn: ['research'] },
        ]);
        expect(result.ok).toBe(true);
        expect(result.ordered).toEqual(['intake', 'research', 'dev']);
    });
    it('returns blocked on cycle', () => {
        const result = (0, DependencyGraphPlanner_1.buildDependencyPlan)([
            { id: 'a', dependsOn: ['b'] },
            { id: 'b', dependsOn: ['a'] },
        ]);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('dependency_cycle_detected');
        expect(result.blocked.sort()).toEqual(['a', 'b']);
    });
});
