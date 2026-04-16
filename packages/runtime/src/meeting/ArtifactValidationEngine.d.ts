import { MeetingSpec } from './MeetingSpec';
import { RoundState } from './RoundEngine';
export interface MeetingArtifact {
    name: string;
    payload: unknown;
    producedBy?: string;
}
export interface ArtifactValidationResult {
    ok: boolean;
    missing: string[];
    reason?: string;
}
export declare class ArtifactValidationEngine {
    validateRequiredArtifacts(spec: MeetingSpec, artifacts: MeetingArtifact[], roundState?: RoundState): ArtifactValidationResult;
    enforceProgression(spec: MeetingSpec, artifacts: MeetingArtifact[], roundState?: RoundState): void;
}
