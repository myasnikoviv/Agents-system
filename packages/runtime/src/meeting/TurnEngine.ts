import { MeetingSpec } from './MeetingSpec';

export interface MeetingTurn {
  turnIndex: number;
  round: number;
  participant: string;
}

export class TurnEngine {
  private locked = false;
  private readonly spec: MeetingSpec;

  constructor(spec: MeetingSpec) {
    this.spec = spec;
  }

  buildPlan(): MeetingTurn[] {
    if (this.spec.turn_strategy !== 'round_robin') {
      throw new Error(`Unsupported turn strategy: ${this.spec.turn_strategy}`);
    }
    const turns: MeetingTurn[] = [];
    let turnIndex = 0;
    for (let round = 1; round <= this.spec.rounds; round += 1) {
      for (const participant of this.spec.participants) {
        turns.push({
          turnIndex,
          round,
          participant,
        });
        turnIndex += 1;
      }
    }
    return turns;
  }

  async runStrict<T>(executor: (turn: MeetingTurn) => Promise<T>): Promise<T[]> {
    if (this.locked) {
      throw new Error('TurnEngine already executing; parallel execution is forbidden');
    }
    this.locked = true;
    try {
      const turns = this.buildPlan();
      const results: T[] = [];
      for (const turn of turns) {
        // explicit sequential await enforces strict no-parallel turn execution
        // eslint-disable-next-line no-await-in-loop
        const result = await executor(turn);
        results.push(result);
      }
      return results;
    } finally {
      this.locked = false;
    }
  }
}

