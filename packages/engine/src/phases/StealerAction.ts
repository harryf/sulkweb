import { Phase } from './Phase.js';
import { GameCycle } from '../GameCycle.js';
import { EndPhase } from './EndPhase.js';

export class StealerAction extends Phase {
  readonly name = 'StealerAction';

  onEnter(): void {}

  next(_ctx: GameCycle): Phase {
    return new EndPhase();
  }
}
