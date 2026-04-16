import { MeetingSpec } from './MeetingSpec';
import { MeetingTurn, TurnEngine } from './TurnEngine';

export interface RoundState {
  currentRound: number;
  completedTurns: number;
  byRound: Record<number, Array<{ participant: string; payload: unknown }>>;
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

export class RoundEngine {
  private readonly turnEngine: TurnEngine;
  private readonly spec: MeetingSpec;

  constructor(spec: MeetingSpec) {
    this.spec = spec;
    this.turnEngine = new TurnEngine(spec);
  }

  initState(): RoundState {
    return {
      currentRound: 0,
      completedTurns: 0,
      byRound: {},
      completed: false,
    };
  }

  async run(
    executeTurn: (turn: MeetingTurn) => Promise<unknown>,
    evaluateExit?: RoundExitEvaluator,
    initialState?: RoundState,
  ): Promise<RoundState> {
    const state: RoundState = initialState ? { ...initialState, byRound: { ...initialState.byRound } } : this.initState();
    const fullPlan = this.turnEngine.buildPlan();

    for (let round = state.currentRound + 1; round <= this.spec.rounds; round += 1) {
      const roundTurns = fullPlan.filter((turn) => turn.round === round);
      if (!state.byRound[round]) state.byRound[round] = [];
      for (const turn of roundTurns) {
        // strict sequential execution, no parallel round processing
        // eslint-disable-next-line no-await-in-loop
        const payload = await executeTurn(turn);
        state.byRound[round].push({ participant: turn.participant, payload });
        state.completedTurns += 1;
      }
      state.currentRound = round;
      if (evaluateExit) {
        const decision = evaluateExit({ round, state, spec: this.spec });
        if (decision.shouldStop) {
          state.completed = true;
          state.stopReason = decision.reason || `exit_condition_round_${round}`;
          return state;
        }
      }
    }

    state.completed = true;
    state.stopReason = state.stopReason || 'max_rounds_completed';
    return state;
  }
}

