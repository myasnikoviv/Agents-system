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

export class ArtifactValidationEngine {
  validateRequiredArtifacts(
    spec: MeetingSpec,
    artifacts: MeetingArtifact[],
    roundState?: RoundState,
  ): ArtifactValidationResult {
    const present = new Set(artifacts.map((a) => String(a.name || '').trim()).filter(Boolean));
    const missing = spec.artifacts.filter((required) => !present.has(required));
    if (missing.length > 0) {
      return {
        ok: false,
        missing,
        reason: `missing_artifacts:${missing.join(',')}`,
      };
    }
    if (roundState && !roundState.completed) {
      return {
        ok: false,
        missing: [],
        reason: 'meeting_rounds_not_completed',
      };
    }
    return { ok: true, missing: [] };
  }

  enforceProgression(
    spec: MeetingSpec,
    artifacts: MeetingArtifact[],
    roundState?: RoundState,
  ): void {
    const result = this.validateRequiredArtifacts(spec, artifacts, roundState);
    if (!result.ok) {
      throw new Error(`[MeetingArtifactValidation] blocked ${result.reason || 'validation_failed'}`);
    }
  }
}

