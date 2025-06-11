import { Phase } from './Phase'
import { GameCycle } from '../GameCycle'
import { EndPhase } from './EndPhase'

export class StealerAction extends Phase {
  readonly name = 'StealerAction'
  next(_ctx: GameCycle) { return new EndPhase() }
}
