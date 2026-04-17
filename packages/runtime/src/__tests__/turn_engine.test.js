"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TurnEngine_1 = require("../meeting/TurnEngine");
function mockSpec() {
    return {
        pipeline: 'meeting',
        mode: 'debate',
        participants: ['architect', 'reviewer', 'devops'],
        moderator: 'architect',
        rounds: 2,
        turn_strategy: 'round_robin',
        rules: [
            'each_agent_must_provide_argument',
            'moderator_must_finalize_decision',
        ],
        artifacts: ['decision'],
    };
}
describe('TurnEngine', () => {
    it('builds deterministic strict round-robin turn order', () => {
        const engine = new TurnEngine_1.TurnEngine(mockSpec());
        const plan = engine.buildPlan();
        expect(plan).toHaveLength(6);
        expect(plan.map((t) => `${t.round}:${t.participant}`)).toEqual([
            '1:architect',
            '1:reviewer',
            '1:devops',
            '2:architect',
            '2:reviewer',
            '2:devops',
        ]);
    });
    it('executes turns strictly sequentially', async () => {
        const engine = new TurnEngine_1.TurnEngine(mockSpec());
        const observed = [];
        await engine.runStrict(async (turn) => {
            observed.push(`start:${turn.turnIndex}`);
            await new Promise((resolve) => setTimeout(resolve, 1));
            observed.push(`end:${turn.turnIndex}`);
            return turn.participant;
        });
        for (let i = 0; i < 6; i += 1) {
            const startAt = observed.indexOf(`start:${i}`);
            const endAt = observed.indexOf(`end:${i}`);
            expect(startAt).toBeGreaterThanOrEqual(0);
            expect(endAt).toBeGreaterThan(startAt);
            if (i < 5) {
                const nextStart = observed.indexOf(`start:${i + 1}`);
                expect(nextStart).toBeGreaterThan(endAt);
            }
        }
    });
    it('blocks concurrent runStrict calls', async () => {
        const engine = new TurnEngine_1.TurnEngine(mockSpec());
        const running = engine.runStrict(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 'ok';
        });
        await expect(engine.runStrict(async () => 'fail')).rejects.toThrow(/parallel execution is forbidden/i);
        await running;
    });
});
