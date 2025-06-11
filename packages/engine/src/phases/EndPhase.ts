import { Phase } from './Phase.js';
import { GameCycle } from '../GameCycle.js';
import { ClockAndCP } from './ClockAndCP.js';

export class EndPhase extends Phase {
  readonly name = 'EndPhase';

  onEnter(): void {}

  next(ctx: GameCycle): Phase {
    ctx.turnNumber++;
    return new ClockAndCP();
  }
}
