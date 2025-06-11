import { Phase } from './Phase'
import { GameCycle } from '../GameCycle'
import { StealerAction } from './StealerAction'

export class MarineAction extends Phase {
  readonly name = 'MarineAction'
  next(_ctx: GameCycle) { return new StealerAction() }
}
