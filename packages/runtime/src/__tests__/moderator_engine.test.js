"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ModeratorEngine_1 = require("../meeting/ModeratorEngine");
function spec() {
    return {
        pipeline: 'meeting',
        mode: 'debate',
        participants: ['architect', 'reviewer'],
        moderator: 'architect',
        rounds: 2,
        turn_strategy: 'round_robin',
        rules: ['each_agent_must_provide_argument', 'moderator_must_finalize_decision'],
        artifacts: ['decision'],
    };
}
describe('ModeratorEngine', () => {
    it('builds moderator question and enforces flow', () => {
        const engine = new ModeratorEngine_1.ModeratorEngine(spec());
        const q = engine.buildRoundQuestion(1);
        expect(q.text).toContain('Round 1');
        const ok = engine.enforceFlow({
            currentRound: 1,
            completedTurns: 2,
            byRound: {
                1: [
                    { participant: 'architect', payload: {} },
                    { participant: 'reviewer', payload: {} },
                ],
            },
            completed: false,
        });
        expect(ok.ok).toBe(true);
        const bad = engine.enforceFlow({
            currentRound: 1,
            completedTurns: 1,
            byRound: {
                1: [{ participant: 'architect', payload: {} }],
            },
            completed: false,
        });
        expect(bad.ok).toBe(false);
    });
    it('generates decision artifact from round state', () => {
        const engine = new ModeratorEngine_1.ModeratorEngine(spec());
        const artifact = engine.buildDecisionArtifact({
            currentRound: 2,
            completedTurns: 4,
            byRound: {
                1: [
                    { participant: 'architect', payload: {} },
                    { participant: 'reviewer', payload: {} },
                ],
                2: [
                    { participant: 'architect', payload: {} },
                    { participant: 'reviewer', payload: {} },
                ],
            },
            completed: true,
        });
        expect(artifact.name).toBe('decision');
        expect(artifact.producedBy).toBe('architect');
        expect(String(artifact.payload.summary)).toContain('round_1');
    });
});
