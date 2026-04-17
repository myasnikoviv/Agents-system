import { MeetingSpec } from './MeetingSpec';
import { RoundState } from './RoundEngine';
import { MeetingArtifact } from './ArtifactValidationEngine';
export interface ModeratorQuestion {
    round: number;
    text: string;
}
export declare class ModeratorEngine {
    private readonly spec;
    constructor(spec: MeetingSpec);
    buildRoundQuestion(round: number): ModeratorQuestion;
    enforceFlow(roundState: RoundState): {
        ok: boolean;
        reason?: string;
    };
    buildDecisionArtifact(roundState: RoundState): MeetingArtifact;
}
