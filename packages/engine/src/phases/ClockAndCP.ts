import { Phase } from './Phase.js';
import { GameCycle } from '../GameCycle.js';
import { MarineAction } from './MarineAction.js';

export class ClockAndCP extends Phase {
  readonly name = 'ClockAndCP';

  onEnter(): void {
    // console.log('Entering ClockAndCP phase');
  }

  next(_ctx: GameCycle): Phase {
    return new MarineAction();
  }
}
