import { MeetingArtifact } from './ArtifactValidationEngine';
import { MeetingSpec } from './MeetingSpec';
import { RoundState } from './RoundEngine';
import { MeetingTurn } from './TurnEngine';
export type MeetingLoopStatus = 'completed' | 'retry' | 'failed';
export interface MeetingLoopResult {
    status: MeetingLoopStatus;
    attempt: number;
    roundState: RoundState;
    artifacts: MeetingArtifact[];
    failureReason?: string;
}
export interface MeetingLoopOptions {
    maxAttempts?: number;
}
export declare class MeetingLoopRuntime {
    private readonly roundEngine;
    private readonly artifactValidator;
    private readonly moderator;
    private readonly spec;
    private readonly maxAttempts;
    constructor(spec: MeetingSpec, options?: MeetingLoopOptions);
    run(executeTurn: (turn: MeetingTurn) => Promise<unknown>, collectArtifacts: (input: {
        roundState: RoundState;
        attempt: number;
    }) => Promise<MeetingArtifact[]>): Promise<MeetingLoopResult>;
}
