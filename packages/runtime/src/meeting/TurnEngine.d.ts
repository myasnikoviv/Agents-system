import { MeetingSpec } from './MeetingSpec';
export interface MeetingTurn {
    turnIndex: number;
    round: number;
    participant: string;
}
export declare class TurnEngine {
    private locked;
    private readonly spec;
    constructor(spec: MeetingSpec);
    buildPlan(): MeetingTurn[];
    runStrict<T>(executor: (turn: MeetingTurn) => Promise<T>): Promise<T[]>;
}
