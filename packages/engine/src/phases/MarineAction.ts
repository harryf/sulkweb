import { Phase } from './Phase.js';
import { GameCycle } from '../GameCycle.js';
import { StealerAction } from './StealerAction.js';

export class MarineAction extends Phase {
  readonly name = 'MarineAction';

  onEnter(): void {}

  next(_ctx: GameCycle): Phase {
    return new StealerAction();
  }
}
