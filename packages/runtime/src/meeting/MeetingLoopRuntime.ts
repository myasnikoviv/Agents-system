import { ArtifactValidationEngine, MeetingArtifact } from './ArtifactValidationEngine';
import { ModeratorEngine } from './ModeratorEngine';
import { MeetingSpec } from './MeetingSpec';
import { RoundEngine, RoundState } from './RoundEngine';
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

export class MeetingLoopRuntime {
  private readonly roundEngine: RoundEngine;
  private readonly artifactValidator = new ArtifactValidationEngine();
  private readonly moderator: ModeratorEngine;
  private readonly spec: MeetingSpec;
  private readonly maxAttempts: number;

  constructor(spec: MeetingSpec, options: MeetingLoopOptions = {}) {
    this.spec = spec;
    this.roundEngine = new RoundEngine(spec);
    this.moderator = new ModeratorEngine(spec);
    this.maxAttempts = Math.max(1, Number(options.maxAttempts ?? 2));
  }

  async run(
    executeTurn: (turn: MeetingTurn) => Promise<unknown>,
    collectArtifacts: (input: { roundState: RoundState; attempt: number }) => Promise<MeetingArtifact[]>,
  ): Promise<MeetingLoopResult> {
    let lastFailure = 'unknown_failure';
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const roundState = await this.roundEngine.run(executeTurn);
      const flow = this.moderator.enforceFlow(roundState);
      if (!flow.ok) {
        return {
          status: 'failed',
          attempt,
          roundState,
          artifacts: [],
          failureReason: flow.reason || 'moderator_flow_enforcement_failed',
        };
      }
      const artifacts = await collectArtifacts({ roundState, attempt });
      const hasDecision = artifacts.some((a) => a.name === 'decision');
      if (!hasDecision) {
        artifacts.push(this.moderator.buildDecisionArtifact(roundState));
      }
      const validation = this.artifactValidator.validateRequiredArtifacts(this.spec, artifacts, roundState);
      if (validation.ok) {
        return { status: 'completed', attempt, roundState, artifacts };
      }
      lastFailure = validation.reason || 'artifact_validation_failed';
      if (attempt < this.maxAttempts) {
        continue;
      }
      return {
        status: 'failed',
        attempt,
        roundState,
        artifacts,
        failureReason: lastFailure,
      };
    }
    return {
      status: 'failed',
      attempt: this.maxAttempts,
      roundState: this.roundEngine.initState(),
      artifacts: [],
      failureReason: lastFailure,
    };
  }
}
