import { Phase } from './phases/Phase.js';
import { ClockAndCP } from './phases/ClockAndCP.js';


export class GameCycle {
  /** Incremented every time EndPhase rolls to ClockAndCP. */
  turnNumber = 1
  phase: Phase

  constructor(initialPhase: Phase = new ClockAndCP()) {
    this.phase = initialPhase
    this.phase.onEnter()
  }

  /** Advance exactly one phase. */
  step(): void {
    this.phase = this.phase.next(this)
    this.phase.onEnter()
  }
}
