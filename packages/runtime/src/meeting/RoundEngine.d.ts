import { MeetingSpec } from './MeetingSpec';
import { MeetingTurn } from './TurnEngine';
export interface RoundState {
    currentRound: number;
    completedTurns: number;
    byRound: Record<number, Array<{
        participant: string;
        payload: unknown;
    }>>;
    completed: boolean;
    stopReason?: string;
}
export interface RoundExitDecision {
    shouldStop: boolean;
    reason?: string;
}
export type RoundExitEvaluator = (input: {
    round: number;
    state: RoundState;
    spec: MeetingSpec;
}) => RoundExitDecision;
export declare class RoundEngine {
    private readonly turnEngine;
    private readonly spec;
    constructor(spec: MeetingSpec);
    initState(): RoundState;
    run(executeTurn: (turn: MeetingTurn) => Promise<unknown>, evaluateExit?: RoundExitEvaluator, initialState?: RoundState): Promise<RoundState>;
}
