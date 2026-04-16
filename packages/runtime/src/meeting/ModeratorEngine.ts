import { MeetingSpec } from './MeetingSpec';
import { RoundState } from './RoundEngine';
import { MeetingArtifact } from './ArtifactValidationEngine';

export interface ModeratorQuestion {
  round: number;
  text: string;
}

export class ModeratorEngine {
  private readonly spec: MeetingSpec;

  constructor(spec: MeetingSpec) {
    this.spec = spec;
  }

  buildRoundQuestion(round: number): ModeratorQuestion {
    const topic = this.spec.mode === 'debate' ? 'argument quality' : this.spec.mode === 'review' ? 'risk review' : 'alignment';
    return {
      round,
      text: `Round ${round}: moderator asks all participants to provide focused input on ${topic}.`,
    };
  }

  enforceFlow(roundState: RoundState): { ok: boolean; reason?: string } {
    const expectedPerRound = this.spec.participants.length;
    for (let r = 1; r <= roundState.currentRound; r += 1) {
      const rows = roundState.byRound[r] || [];
      if (rows.length < expectedPerRound) {
        return { ok: false, reason: `round_${r}_incomplete` };
      }
    }
    return { ok: true };
  }

  buildDecisionArtifact(roundState: RoundState): MeetingArtifact {
    const summaries: string[] = [];
    for (let r = 1; r <= roundState.currentRound; r += 1) {
      const rows = roundState.byRound[r] || [];
      const participants = rows.map((x) => x.participant).join(', ');
      summaries.push(`round_${r}: ${participants}`);
    }
    return {
      name: 'decision',
      producedBy: this.spec.moderator,
      payload: {
        moderator: this.spec.moderator,
        rounds: roundState.currentRound,
        summary: summaries.join(' | '),
      },
    };
  }
}

